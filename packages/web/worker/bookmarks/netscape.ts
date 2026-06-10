/**
 * Parse and serialize the Netscape bookmark file format (`bookmarks.html`) —
 * the de-facto import/export format used by Chrome, Firefox, Safari,
 * Pinboard, et al.
 *
 * The format is intentionally malformed HTML (unclosed <DT>/<DD> tags), so
 * this is a tolerant token-based parser rather than a DOM walk.
 */

export type ParsedNetscapeBookmark = {
  url: string
  title: string | null
  description: string | null
  tags: string[]
  createdAt: Date | null
}

export type ExportableBookmark = {
  url: string
  title: string | null
  description: string | null
  tags: string[] | null
  createdAt: Date
  modifiedAt: Date
  public: boolean
}

// Browser root folders that carry no meaning as tags
const ROOT_FOLDER_NAMES = new Set([
  'bookmarks',
  'bookmarks bar',
  'bookmarks menu',
  'bookmarks toolbar',
  'favorites',
  'favorites bar',
  'imported',
  'mobile bookmarks',
  'other bookmarks',
  'unsorted bookmarks',
])

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

// String.fromCodePoint throws on code points above U+10FFFF
const decodeCodePoint = (codePoint: number, fallback: string) => {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback
  }

  return String.fromCodePoint(codePoint)
}

export const decodeEntities = (value: string) =>
  value.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi,
    (match, hex, dec, named) => {
      if (hex) return decodeCodePoint(Number.parseInt(hex, 16), match)
      if (dec) return decodeCodePoint(Number.parseInt(dec, 10), match)
      const entity = NAMED_ENTITIES[(named as string).toLowerCase()]
      return entity ?? match
    },
  )

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const parseAttributes = (raw: string) => {
  const attributes: Record<string, string> = {}

  for (const match of raw.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2])
  }

  return attributes
}

// ADD_DATE is unix seconds, but some exporters use ms or µs
const parseTimestamp = (value: string | undefined) => {
  if (!value) return null

  let timestamp = Number.parseInt(value, 10)

  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  if (timestamp > 1e15) timestamp = Math.floor(timestamp / 1e6)
  else if (timestamp > 1e12) timestamp = Math.floor(timestamp / 1e3)

  const date = new Date(timestamp * 1000)

  return Number.isNaN(date.getTime()) ? null : date
}

const cleanText = (value: string) =>
  decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const SKIPPED_PROTOCOLS = /^(?:javascript|place|data|about|chrome|file):/i

const TOKEN_PATTERN =
  /<DT[^>]*>\s*<H3([^>]*)>([\s\S]*?)<\/H3>|<DT[^>]*>\s*<A([^>]*)>([\s\S]*?)<\/A>|<DL[^>]*>|<\/DL>|<DD[^>]*>([\s\S]*?)(?=<DT|<DL|<\/DL|<DD|<HR|$)/gi

export const parseNetscapeBookmarks = (
  html: string,
): ParsedNetscapeBookmark[] => {
  const items: ParsedNetscapeBookmark[] = []
  const seenUrls = new Set<string>()
  const folderStack: string[] = []
  let pendingFolder: string | null = null
  let lastItem: ParsedNetscapeBookmark | null = null

  for (const match of html.matchAll(TOKEN_PATTERN)) {
    const [token, h3Attrs, h3Text, aAttrs, aText, ddText] = match

    // a <DD> description only belongs to a bookmark when it immediately
    // follows its <DT><A> — reset lastItem on any folder or list boundary so
    // folder descriptions are not misattributed to the previous bookmark
    if (h3Attrs !== undefined) {
      pendingFolder = cleanText(h3Text)
      lastItem = null
      continue
    }

    if (/^<DL/i.test(token)) {
      folderStack.push(pendingFolder ?? '')
      pendingFolder = null
      lastItem = null
      continue
    }

    if (/^<\/DL/i.test(token)) {
      folderStack.pop()
      lastItem = null
      continue
    }

    if (aAttrs !== undefined) {
      const attributes = parseAttributes(aAttrs)
      const url = attributes.href?.trim()

      lastItem = null

      if (!url || SKIPPED_PROTOCOLS.test(url) || seenUrls.has(url)) {
        continue
      }

      const tags = new Set<string>()

      for (const tag of (attributes.tags ?? '').split(',')) {
        const trimmed = tag.trim()
        if (trimmed) tags.add(trimmed)
      }

      for (const folder of folderStack) {
        const trimmed = folder.trim()
        if (trimmed && !ROOT_FOLDER_NAMES.has(trimmed.toLowerCase())) {
          tags.add(trimmed)
        }
      }

      const title = cleanText(aText)
      const item: ParsedNetscapeBookmark = {
        createdAt: parseTimestamp(attributes.add_date),
        description: null,
        tags: [...tags],
        title: title || null,
        url,
      }

      seenUrls.add(url)
      items.push(item)
      lastItem = item
      continue
    }

    if (ddText !== undefined && lastItem && !lastItem.description) {
      const description = cleanText(ddText)
      if (description) lastItem.description = description
    }
  }

  return items
}

const toUnixSeconds = (date: Date) => Math.floor(date.getTime() / 1000)

export const serializeNetscapeBookmarks = (
  items: ExportableBookmark[],
): string => {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  for (const item of items) {
    const attributes = [
      `HREF="${escapeHtml(item.url)}"`,
      `ADD_DATE="${toUnixSeconds(item.createdAt)}"`,
      `LAST_MODIFIED="${toUnixSeconds(item.modifiedAt)}"`,
      `PRIVATE="${item.public ? '0' : '1'}"`,
    ]

    if (item.tags?.length) {
      attributes.push(`TAGS="${escapeHtml(item.tags.join(','))}"`)
    }

    lines.push(
      `    <DT><A ${attributes.join(' ')}>${escapeHtml(item.title || item.url)}</A>`,
    )

    if (item.description) {
      lines.push(`    <DD>${escapeHtml(item.description)}`)
    }
  }

  lines.push('</DL><p>', '')

  return lines.join('\n')
}
