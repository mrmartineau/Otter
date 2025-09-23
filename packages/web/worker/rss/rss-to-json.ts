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

export const feedToJson = async (
  feedUrl: string,
): Promise<Feed | undefined> => {
  const req = await fetch(feedUrl)
  const xmlData = await req.text()
  const data = parser.parse(xmlData)

  let feed: Feed | undefined
  if (data.feed) {
    feed = reformatData(data.feed)
  }
  if (data.rss) {
    feed = reformatData(data.rss)
  }

  return feed
}

function reformatData(d: any): Feed {
  if (d?.link?.length) {
    d.link = d.link.map(fixLink)
  }

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
      link: d.channel.link,
      title: d.channel.title,
    }

    result.entries = d.channel.item?.map(
      ({ title, link, pubDate, 'content:encoded': content, ...rest }: any) => {
        return {
          content,
          link: link,
          published: pubDate,
          title: title,
          ...rest,
        }
      },
    )
  } else {
    result.feed = {
      title: d.title,
    }

    if (d.link) {
      const alt = d.link?.filter((item: any) => item.rel === 'alternate')
      if (alt.length) result.feed.link = alt[0].href
      else {
        // accept the link with _no_ rel
        result.feed.link = d.link?.filter((item: any) => !item.rel)[0].href
      }
    }

    result.entries = d.entry?.map(
      ({ title, link, updated, content, ...rest }: any) => {
        if (link) {
          link = fixLink(link)
        }

        if (content) {
          const newContent: any = {}
          newContent.text = content['#text']
          newContent.type = content['@_type']
          content = newContent
        }

        return {
          content: content.text,
          link: link.href,
          published: updated,
          title: title,
          ...rest,
        }
      },
    )
  }

  return result
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
