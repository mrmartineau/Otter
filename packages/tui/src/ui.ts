import {
  bold,
  cursor,
  dim,
  fg,
  italic,
  padToWidth,
  palette,
  screen,
  stringWidth,
  truncate,
} from './ansi.ts'
import type { Bookmark, TagCount } from './api.ts'
import { domain, formatCount, relativeTime, wrapText } from './format.ts'
import type { AppState } from './state.ts'

const accent = fg(palette.accent)
const muted = fg(palette.muted)
const danger = fg(palette.danger)
const starColor = fg(palette.star)
const tagColor = fg(palette.tag)
const urlColor = fg(palette.url)
const borderColor = fg(palette.border)

const CURSOR_BLOCK = '▌'

export const visibleItems = (height: number) =>
  Math.max(1, Math.floor((height - 4) / 2))

const filterChips = (state: AppState) => {
  const chips: string[] = []

  if (state.query) {
    chips.push(italic(`“${state.query}”`))
  }

  if (state.starOnly) {
    chips.push(starColor('★ starred'))
  }

  if (state.tag) {
    chips.push(tagColor(`#${state.tag}`))
  }

  if (state.typeFilter) {
    chips.push(urlColor(state.typeFilter))
  }

  return chips.length ? chips.join(dim(' · ')) : dim('all bookmarks')
}

const header = (state: AppState, width: number) => {
  const left = ` ${accent(bold('🦦 Otter'))}  ${filterChips(state)}`
  const page = Math.floor(state.offset / state.pageSize) + 1
  const pages = Math.max(1, Math.ceil(state.count / state.pageSize))
  const right = `${muted(
    `${formatCount(state.count)} saved · page ${page}/${pages}`,
  )} `
  const gap = width - stringWidth(left) - stringWidth(right)

  if (gap < 1) {
    return left
  }

  return left + ' '.repeat(gap) + right
}

const bookmarkLines = (
  bookmark: Bookmark,
  selected: boolean,
  width: number,
) => {
  const marker = selected ? accent('❯ ') : '  '
  const star = bookmark.star ? starColor('★ ') : '  '
  const type = bookmark.type ?? ''
  const titleMax = width - 4 - (type ? stringWidth(type) + 2 : 0) - 1
  const rawTitle = bookmark.title || bookmark.url || '(untitled)'
  const title = truncate(rawTitle, Math.max(titleMax, 8))
  const styledTitle = selected ? bold(title) : title
  const gap =
    width - 4 - stringWidth(title) - (type ? stringWidth(type) : 0) - 1
  const lineOne =
    marker +
    star +
    styledTitle +
    (type && gap > 0 ? ' '.repeat(gap) + muted(type) : '')

  const metaParts: string[] = []
  const host = domain(bookmark.url)

  if (host) {
    metaParts.push(host)
  }

  for (const tag of bookmark.tags ?? []) {
    metaParts.push(`#${tag}`)
  }

  metaParts.push(relativeTime(bookmark.created_at))

  let plainMeta = metaParts.join(' · ')
  plainMeta = truncate(plainMeta, width - 5)
  const styledMeta = plainMeta
    .split(' · ')
    .map((part) => {
      if (part.startsWith('#')) {
        return tagColor(part)
      }

      if (part === host) {
        return urlColor(part)
      }

      return muted(part)
    })
    .join(dim(' · '))

  return [lineOne, `    ${styledMeta}`]
}

const listBody = (state: AppState, width: number, bodyHeight: number) => {
  const lines: string[] = []

  if (!state.items.length) {
    const message = state.loading ? 'fetching bookmarks…' : 'No bookmarks found'
    const hint = state.loading
      ? ''
      : state.query || state.tag || state.starOnly || state.typeFilter
        ? 'press x to clear filters'
        : 'press a to add your first bookmark'
    const top = Math.max(0, Math.floor(bodyHeight / 2) - 1)

    for (let i = 0; i < top; i += 1) {
      lines.push('')
    }

    lines.push(center(muted(message), width))

    if (hint) {
      lines.push(center(dim(hint), width))
    }

    return lines
  }

  for (const [index, bookmark] of state.items.entries()) {
    if (lines.length + 2 > bodyHeight) {
      break
    }

    lines.push(...bookmarkLines(bookmark, index === state.selected, width))
  }

  return lines
}

const center = (text: string, width: number) => {
  const padding = Math.max(0, Math.floor((width - stringWidth(text)) / 2))

  return ' '.repeat(padding) + text
}

const panel = (
  title: string,
  content: string[],
  width: number,
  bodyHeight: number,
) => {
  const innerWidth = Math.min(width - 6, 76)
  const top = `╭─ ${title} ${'─'.repeat(Math.max(0, innerWidth - stringWidth(title) - 3))}╮`
  const bottom = `╰${'─'.repeat(innerWidth)}╯`
  const body = content
    .slice(0, bodyHeight - 2)
    .map(
      (line) =>
        `${borderColor('│')} ${padToWidth(line, innerWidth - 2)} ${borderColor('│')}`,
    )
  const lines = [borderColor(top), ...body, borderColor(bottom)]
  const leftPad = ' '.repeat(
    Math.max(0, Math.floor((width - innerWidth - 2) / 2)),
  )

  return lines.map((line) => leftPad + line)
}

const helpBody = (width: number, bodyHeight: number) => {
  const entry = (key: string, label: string) =>
    `${accent(key.padEnd(11))}${label}`
  const content = [
    '',
    entry('↑/↓ j/k', 'move selection'),
    entry('←/→ h/l', 'previous / next page'),
    entry('enter o', 'open in browser'),
    entry('i', 'bookmark details'),
    entry('/', 'search'),
    entry('a', 'add a bookmark (scrapes the URL)'),
    entry('s', 'star / unstar'),
    entry('d', 'delete (asks first)'),
    entry('f', 'toggle starred filter'),
    entry('t', 'filter by tag'),
    entry('c', 'cycle type filter'),
    entry('x', 'clear search + filters'),
    entry('r', 'refresh'),
    entry('q', 'quit'),
    '',
    dim(`config: OTTER_BASE_URL / OTTER_API_KEY or otter-tui login`),
  ]

  return panel('help', content, width, bodyHeight)
}

const detailBody = (state: AppState, width: number, bodyHeight: number) => {
  const bookmark = state.items[state.selected]

  if (!bookmark) {
    return [center(muted('nothing selected'), width)]
  }

  const innerWidth = Math.min(width - 6, 76) - 2
  const content: string[] = ['']

  for (const line of wrapText(bookmark.title || '(untitled)', innerWidth)) {
    content.push(bold(line))
  }

  if (bookmark.url) {
    for (const line of wrapText(bookmark.url, innerWidth)) {
      content.push(urlColor(line))
    }
  }

  content.push('')

  const meta = [
    bookmark.type ?? 'link',
    bookmark.star ? '★ starred' : null,
    bookmark.public ? 'public' : null,
    `${bookmark.click_count} click${bookmark.click_count === 1 ? '' : 's'}`,
    `saved ${relativeTime(bookmark.created_at)} ago`,
  ].filter(Boolean)
  content.push(muted(meta.join(' · ')))

  if (bookmark.tags?.length) {
    content.push(tagColor(bookmark.tags.map((tag) => `#${tag}`).join(' ')))
  }

  if (bookmark.description) {
    content.push('')

    for (const line of wrapText(bookmark.description, innerWidth)) {
      content.push(line)
    }
  }

  if (bookmark.note) {
    content.push('')
    content.push(accent('note'))

    for (const line of wrapText(bookmark.note, innerWidth)) {
      content.push(italic(line))
    }
  }

  content.push('')

  return panel('details', content, width, bodyHeight)
}

const tagsBody = (state: AppState, width: number, bodyHeight: number) => {
  const innerWidth = Math.min(width - 6, 76) - 2
  const matches = tagMatches(state.tags, state.tagInput)
  const content: string[] = [
    `${dim('filter:')} ${state.tagInput}${CURSOR_BLOCK}`,
    '',
  ]
  const maxRows = Math.max(1, bodyHeight - 6)
  const start = Math.max(
    0,
    Math.min(
      state.tagCursor - Math.floor(maxRows / 2),
      matches.length - maxRows,
    ),
  )

  for (const [index, tag] of matches.slice(start, start + maxRows).entries()) {
    const selected = start + index === state.tagCursor
    const marker = selected ? accent('❯ ') : '  '
    const label = truncate(`#${tag.tag}`, innerWidth - 8)
    const line = `${marker}${selected ? bold(label) : tagColor(label)} ${muted(`(${tag.count})`)}`
    content.push(line)
  }

  if (!matches.length) {
    content.push(muted('  no matching tags'))
  }

  return panel('filter by tag', content, width, bodyHeight)
}

export const tagMatches = (tags: TagCount[], filter: string) =>
  tags.filter((tag) => tag.tag.toLowerCase().includes(filter.toLowerCase()))

const statusLine = (state: AppState, width: number) => {
  if (state.mode === 'search') {
    return ` ${accent('/')} ${state.input}${CURSOR_BLOCK}`
  }

  if (state.mode === 'add') {
    return ` ${accent('+ url:')} ${state.input}${CURSOR_BLOCK}`
  }

  if (state.mode === 'confirm-delete') {
    const bookmark = state.items[state.selected]
    const title = truncate(
      bookmark?.title || bookmark?.url || 'this bookmark',
      width - 24,
    )

    return ` ${danger(`delete “${title}”? `)}${bold('y')}${dim('/')}${bold('N')}`
  }

  if (state.loading) {
    return ` ${muted('loading…')}`
  }

  if (state.status) {
    const colorise = state.statusKind === 'error' ? danger : muted

    return ` ${colorise(truncate(state.status, width - 2))}`
  }

  return ''
}

const FOOTER_HINTS: Partial<Record<AppState['mode'], string>> = {
  add: '⏎ save · esc cancel',
  'confirm-delete': 'y delete · n cancel',
  detail: 'j/k prev/next · ⏎ open · s star · esc back',
  help: 'press any key to close',
  list: '⏎ open · / search · a add · s star · d delete · t tag · i details · ? help · q quit',
  search: '⏎ search · esc cancel',
  tags: 'type to filter · ⏎ apply · esc close',
}

export const renderFrame = (state: AppState, width: number, height: number) => {
  const bodyHeight = height - 4
  let body: string[]

  switch (state.mode) {
    case 'help':
      body = helpBody(width, bodyHeight)
      break
    case 'detail':
      body = detailBody(state, width, bodyHeight)
      break
    case 'tags':
      body = tagsBody(state, width, bodyHeight)
      break
    default:
      body = listBody(state, width, bodyHeight)
  }

  while (body.length < bodyHeight) {
    body.push('')
  }

  const lines = [
    header(state, width),
    borderColor('─'.repeat(width)),
    ...body.slice(0, bodyHeight),
    statusLine(state, width),
    ` ${dim(truncate(FOOTER_HINTS[state.mode] ?? '', width - 2))}`,
  ]

  return (
    cursor.home +
    lines.map((line) => line + screen.clearLine).join('\n') +
    screen.clearDown
  )
}
