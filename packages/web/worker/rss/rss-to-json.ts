import { XMLParser } from 'fast-xml-parser'

export interface Feed {
  feed: FeedMetadata
  entries: Entry[]
}

export interface Entry {
  title: string
  link: string
  published: string
  guid?: {
    '#text': string
    '@_isPermaLink': string
  }
  [key: string]: unknown
}

export interface FeedMetadata {
  title: string
  link?: string
}

const options = {
  ignoreAttributes: false,
}
const parser = new XMLParser(options)

export const feedTextToJson = (xmlData: string): Feed | undefined => {
  let data: any
  try {
    data = parser.parse(xmlData)
  } catch {
    return undefined
  }

  let feed: Feed | undefined
  if (data.feed) {
    feed = reformatData(data.feed)
  }
  if (data.rss) {
    feed = reformatData(data.rss)
  }

  return feed
}

export const feedToJson = async (
  feedUrl: string,
): Promise<Feed | undefined> => {
  const req = await fetch(feedUrl)
  const xmlData = await req.text()
  return feedTextToJson(xmlData)
}

function reformatData(d: any): Feed {
  const result: Feed = {
    entries: [],
    feed: {
      link: '',
      title: '',
    },
  }

  // feed is metadata about the feed
  if (d.channel) {
    result.feed = {
      link: textOf(d.channel.link),
      title: textOf(d.channel.title),
    }

    result.entries = toArray(d.channel.item).map(
      ({ title, link, pubDate, 'content:encoded': content, ...rest }: any) => {
        return {
          content: textOf(content),
          link: textOf(link),
          published: pubDate,
          title: textOf(title),
          ...rest,
        }
      },
    )
  } else {
    result.feed = {
      link: pickHref(d.link),
      title: textOf(d.title),
    }

    result.entries = toArray(d.entry).map(
      ({ title, link, updated, content, ...rest }: any) => {
        return {
          content: textOf(content),
          link: pickHref(link),
          published: updated,
          title: textOf(title),
          ...rest,
        }
      },
    )
  }

  return result
}

// fast-xml-parser emits `{ '#text': '…', '@_type': 'html' }` for any element
// that carries attributes (e.g. Atom `<title type="html">`). Unwrap those back
// to a plain string so they can be rendered directly as React children.
function textOf(value: any): string {
  if (value == null) {
    return ''
  }
  if (typeof value === 'object') {
    return String(value['#text'] ?? '')
  }
  return String(value)
}

// fast-xml-parser returns a bare object (not an array) when a feed
// only has a single item/entry
function toArray(value: any): any[] {
  if (value === undefined || value === null) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

// Atom elements may carry one <link> (parsed as an object) or several (an
// array). Normalise to an array, then prefer the alternate (or rel-less) link
// for the canonical href.
function pickHref(link: any): string {
  const links = toArray(link).map(fixLink)
  return (
    links.find((l) => l.rel === 'alternate')?.href ??
    links.find((l) => !l.rel)?.href ??
    links[0]?.href ??
    ''
  )
}

function fixLink(l: any) {
  const result: any = {}
  if (l['@_href']) {
    result.href = l['@_href']
  }
  if (l['@_rel']) {
    result.rel = l['@_rel']
  }
  if (l['@_type']) {
    result.type = l['@_type']
  }
  if (l['@_title']) {
    result.type = l['@_title']
  }
  return result
}
