import { parseHTML } from 'linkedom'
import { type Feed, feedTextToJson } from '../rss/rss-to-json'

export interface DiscoveredFeed {
  description: string | null
  feedUrl: string
  siteUrl: string | null
  title: string | null
}

const FEED_LINK_SELECTOR = [
  'link[rel="alternate"][type="application/rss+xml"]',
  'link[rel="alternate"][type="application/atom+xml"]',
  'link[type="application/rss+xml"]',
  'link[type="application/atom+xml"]',
].join(', ')

const COMMON_FEED_PATHS = [
  '/feed',
  '/rss',
  '/feed.xml',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feed/',
]

const FETCH_HEADERS = {
  accept:
    'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
  'user-agent': 'Otter RSS reader (+https://github.com/mrmartineau/Otter)',
}

export const normaliseFeedInputUrl = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return null
  }
}

const discoveredFromFeed = (url: string, feed: Feed): DiscoveredFeed => ({
  description: null,
  feedUrl: url,
  siteUrl: typeof feed.feed.link === 'string' ? feed.feed.link : null,
  title: typeof feed.feed.title === 'string' ? feed.feed.title : null,
})

const fetchFeed = async (url: string): Promise<DiscoveredFeed | null> => {
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS })
    if (!response.ok) {
      return null
    }
    const feed = feedTextToJson(await response.text())
    return feed ? discoveredFromFeed(url, feed) : null
  } catch {
    return null
  }
}

/**
 * Resolve a user-supplied URL to an RSS/Atom feed. The URL can be the feed
 * itself, or a site URL whose feed is discovered via `<link rel="alternate">`
 * tags (falling back to common feed paths).
 */
export const discoverFeed = async (
  inputUrl: string,
): Promise<DiscoveredFeed | null> => {
  const url = normaliseFeedInputUrl(inputUrl)
  if (!url) {
    return null
  }

  let body: string
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS })
    if (!response.ok) {
      return null
    }
    body = await response.text()
  } catch {
    return null
  }

  // The URL may already point at a feed
  const directFeed = feedTextToJson(body)
  if (directFeed) {
    return discoveredFromFeed(url, directFeed)
  }

  // Otherwise treat it as an HTML page and look for advertised feeds
  try {
    const { document } = parseHTML(body)
    const link = document.querySelector(FEED_LINK_SELECTOR)
    const href = link?.getAttribute('href')
    if (href) {
      const feedUrl = new URL(href, url).toString()
      const found = await fetchFeed(feedUrl)
      if (found) {
        return { ...found, siteUrl: found.siteUrl ?? url }
      }
    }
  } catch {
    // fall through to common paths
  }

  for (const path of COMMON_FEED_PATHS) {
    const candidate = new URL(path, url).toString()
    const found = await fetchFeed(candidate)
    if (found) {
      return { ...found, siteUrl: found.siteUrl ?? url }
    }
  }

  return null
}
