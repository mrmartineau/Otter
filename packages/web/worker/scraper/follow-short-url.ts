const MAX_REDIRECTS = 5
const HEAD_TIMEOUT_MS = 10000

export interface FollowShortUrlResponse {
  urls: string[]
  unshortened_url: string
}
// This function follows a short URL and returns the final URL, use https://t.co/wy9S5P0Cd2 as an example.
export const followShortUrl = async (
  urls: string[],
  redirectCount = 0,
): Promise<FollowShortUrlResponse> => {
  if (redirectCount >= MAX_REDIRECTS) {
    throw new Error(`Maximum redirects exceeded.`)
  }

  const currentUrl = urls[urls.length - 1]
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)

  let fetchResponse: Response
  try {
    fetchResponse = await fetch(currentUrl, {
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        referrer: 'http://www.google.com/',
      },
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  const location = fetchResponse.headers.get('location')
  if (location) {
    // Resolve relative redirect URLs against the current URL
    const resolvedLocation = new URL(location, currentUrl).toString()
    urls.push(resolvedLocation)
    return followShortUrl(urls, redirectCount + 1)
  }

  return {
    unshortened_url: currentUrl,
    urls,
  }
}
