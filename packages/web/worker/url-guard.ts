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

const isIpLiteral = (hostname: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')

// Best-effort DNS check: a hostname that passes the syntactic guard can
// still resolve to a private address. Workers cannot pin the IP a fetch
// will use (classic TOCTOU/DNS-rebinding gap remains), and in production
// Cloudflare's egress already refuses non-public destinations — this check
// exists to also catch private-resolving hostnames in local/self-hosted
// setups. Resolution failures fail open so scraping does not depend on the
// DoH endpoint's availability; a successful lookup that includes any
// private address fails closed.
const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query'
const DNS_CACHE_TTL_MS = 60_000
const DNS_CACHE_MAX = 256
const dnsCache = new Map<string, { expires: number; ok: boolean }>()

const isPrivateAddress = (address: string): boolean =>
  isPrivateIpv4(address) || isPrivateIpv6(address)

const lookupAddresses = async (
  hostname: string,
  type: 'A' | 'AAAA',
): Promise<string[]> => {
  const response = await fetch(
    `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=${type}`,
    { headers: { accept: 'application/dns-json' } },
  )

  if (!response.ok) {
    throw new Error(`DNS lookup failed: ${response.status}`)
  }

  const result = (await response.json()) as {
    Answer?: { data?: string; type?: number }[]
  }

  return (result.Answer ?? [])
    .filter((answer) => answer.type === 1 || answer.type === 28)
    .map((answer) => answer.data ?? '')
    .filter(Boolean)
}

export const assertResolvesPublic = async (url: URL): Promise<void> => {
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')

  // IP literals were already fully validated syntactically
  if (isIpLiteral(hostname.replace(/^\[|\]$/g, ''))) {
    return
  }

  const cached = dnsCache.get(hostname)
  if (cached && cached.expires > Date.now()) {
    if (!cached.ok) {
      throw new Error('URL host resolves to a disallowed address')
    }
    return
  }

  let ok = true

  try {
    const [a, aaaa] = await Promise.all([
      lookupAddresses(hostname, 'A'),
      lookupAddresses(hostname, 'AAAA'),
    ])
    ok = ![...a, ...aaaa].some((address) =>
      isPrivateAddress(address.toLowerCase()),
    )
  } catch {
    // fail open — DoH unavailable or unparsable must not break scraping
    return
  }

  if (dnsCache.size >= DNS_CACHE_MAX) {
    dnsCache.clear()
  }
  dnsCache.set(hostname, { expires: Date.now() + DNS_CACHE_TTL_MS, ok })

  if (!ok) {
    throw new Error('URL host resolves to a disallowed address')
  }
}

/**
 * Combined guard for URLs the worker is about to fetch: syntactic checks
 * plus the best-effort DNS resolution check.
 */
export const assertSafePublicUrlResolved = async (
  input: string,
): Promise<URL> => {
  const url = assertSafePublicUrl(input)
  await assertResolvesPublic(url)
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
  let currentUrl = (await assertSafePublicUrlResolved(input)).toString()

  // `<=` is intentional: iteration 0 is the initial request, so the loop
  // allows the initial fetch plus up to MAX_SAFE_REDIRECTS redirect hops.
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
    currentUrl = (
      await assertSafePublicUrlResolved(
        new URL(location, currentUrl).toString(),
      )
    ).toString()
  }

  throw new Error('Too many redirects')
}
