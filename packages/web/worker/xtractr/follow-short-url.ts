const MAX_REDIRECTS = 20
const HEAD_TIMEOUT_MS = 10_000

export interface FollowShortUrlResponse {
  urls: string[]
  unshortened_url: string
}

async function requestRedirectLocation(
  currentUrl: string,
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)

  try {
    const headResponse = await fetch(currentUrl, {
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
    return headResponse.headers.get('location')
  } catch {
    const getController = new AbortController()
    const getTimeoutId = setTimeout(
      () => getController.abort(),
      HEAD_TIMEOUT_MS,
    )
    try {
      const getResponse = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: getController.signal,
      })
      return getResponse.headers.get('location')
    } finally {
      clearTimeout(getTimeoutId)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export const followShortUrl = async (
  urls: string[],
  redirectCount = 0,
): Promise<FollowShortUrlResponse> => {
  if (redirectCount >= MAX_REDIRECTS) {
    const currentUrl = urls[urls.length - 1]
    return {
      unshortened_url: currentUrl,
      urls,
    }
  }

  const currentUrl = urls[urls.length - 1]
  const location = await requestRedirectLocation(currentUrl)
  if (location) {
    const resolvedLocation = new URL(location, currentUrl).toString()
    urls.push(resolvedLocation)
    return followShortUrl(urls, redirectCount + 1)
  }

  return {
    unshortened_url: currentUrl,
    urls,
  }
}
