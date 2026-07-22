const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
]

const isPrivateIpv4 = (hostname: string): boolean => {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)

  if (!match) {
    return false
  }

  const octets = match.slice(1).map(Number)

  if (octets.some((octet) => octet > 255)) {
    // Not a valid IPv4 literal; treat as hostname
    return false
  }

  const [a, b] = octets

  return (
    a === 0 || // "this network"
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) // benchmarking
  )
}

const isPrivateIpv6 = (hostname: string): boolean => {
  const address = hostname.replace(/^\[|\]$/g, '').toLowerCase()

  if (!address.includes(':')) {
    return false
  }

  return (
    address === '::' ||
    address === '::1' ||
    address.startsWith('fc') ||
    address.startsWith('fd') || // unique local fc00::/7
    /^fe[89ab]/.test(address) || // link-local fe80::/10 (fe80–febf)
    address.startsWith('::ffff:') // IPv4-mapped — could smuggle private IPv4
  )
}

/**
 * Validates a user-supplied URL before the worker fetches it server-side.
 * Returns the parsed URL, or throws for non-http(s) schemes and
 * loopback/private/link-local targets (SSRF guard).
 */
export const assertSafePublicUrl = (input: string): URL => {
  let url: URL

  try {
    url = new URL(input)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported')
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')

  if (
    hostname === 'localhost' ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    throw new Error('URL host is not allowed')
  }

  return url
}

const MAX_SAFE_REDIRECTS = 10

/**
 * fetch() that re-validates the URL on every redirect hop, so a public URL
 * cannot bounce the worker to an internal address. Always fetches with
 * `redirect: 'manual'`; a redirect response without a Location header is
 * returned as-is.
 */
export const safeFetch = async (
  input: string,
  init?: RequestInit,
): Promise<Response> => {
  let currentUrl = assertSafePublicUrl(input).toString()

  for (let redirects = 0; redirects <= MAX_SAFE_REDIRECTS; redirects++) {
    const response = await fetch(currentUrl, { ...init, redirect: 'manual' })

    if (response.status < 300 || response.status >= 400) {
      return response
    }

    const location = response.headers.get('location')

    if (!location) {
      return response
    }

    await response.body?.cancel()
    currentUrl = assertSafePublicUrl(
      new URL(location, currentUrl).toString(),
    ).toString()
  }

  throw new Error('Too many redirects')
}
