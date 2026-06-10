import { XMLParser } from 'fast-xml-parser'

export interface OpmlFeed {
  feedUrl: string
  folder: string | null
  siteUrl: string | null
  title: string | null
}

const parser = new XMLParser({
  ignoreAttributes: false,
})

const toArray = (value: unknown): any[] => {
  if (value === undefined || value === null) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

const walkOutlines = (
  outlines: any[],
  folder: string | null,
  results: OpmlFeed[],
) => {
  for (const outline of outlines) {
    const feedUrl =
      typeof outline['@_xmlUrl'] === 'string' ? outline['@_xmlUrl'].trim() : ''

    if (feedUrl) {
      results.push({
        feedUrl,
        folder,
        siteUrl: outline['@_htmlUrl'] ? String(outline['@_htmlUrl']) : null,
        title: outline['@_title']
          ? String(outline['@_title'])
          : outline['@_text']
            ? String(outline['@_text'])
            : null,
      })
      continue
    }

    const children = toArray(outline.outline)
    if (children.length) {
      const name = outline['@_text']
        ? String(outline['@_text'])
        : outline['@_title']
          ? String(outline['@_title'])
          : null
      const childFolder =
        folder && name ? `${folder}/${name}` : (name ?? folder)
      walkOutlines(children, childFolder, results)
    }
  }
}

export const parseOpml = (xml: string): OpmlFeed[] => {
  let data: any
  try {
    data = parser.parse(xml)
  } catch {
    return []
  }

  const body = data?.opml?.body
  if (!body) {
    return []
  }

  const results: OpmlFeed[] = []
  walkOutlines(toArray(body.outline), null, results)

  // de-dupe by feed url, keeping the first occurrence
  const seen = new Set<string>()
  return results.filter((feed) => {
    if (seen.has(feed.feedUrl)) {
      return false
    }
    seen.add(feed.feedUrl)
    return true
  })
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const outlineForFeed = (feed: OpmlFeed) => {
  const title = escapeXml(feed.title ?? feed.feedUrl)
  const htmlUrl = feed.siteUrl ? ` htmlUrl="${escapeXml(feed.siteUrl)}"` : ''
  return `<outline type="rss" text="${title}" title="${title}" xmlUrl="${escapeXml(feed.feedUrl)}"${htmlUrl}/>`
}

export const buildOpml = (feeds: OpmlFeed[]): string => {
  const folders = new Map<string, OpmlFeed[]>()
  const topLevel: OpmlFeed[] = []

  for (const feed of feeds) {
    if (feed.folder) {
      const group = folders.get(feed.folder) ?? []
      group.push(feed)
      folders.set(feed.folder, group)
    } else {
      topLevel.push(feed)
    }
  }

  const lines: string[] = []
  for (const [folder, group] of folders) {
    const name = escapeXml(folder)
    lines.push(`    <outline text="${name}" title="${name}">`)
    for (const feed of group) {
      lines.push(`      ${outlineForFeed(feed)}`)
    }
    lines.push('    </outline>')
  }
  for (const feed of topLevel) {
    lines.push(`    ${outlineForFeed(feed)}`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Otter feed subscriptions</title>
  </head>
  <body>
${lines.join('\n')}
  </body>
</opml>
`
}
