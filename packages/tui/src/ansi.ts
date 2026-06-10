/**
 * Minimal ANSI/terminal helpers — no dependencies.
 *
 * Style helpers wrap text in SGR escape codes. Text measurement helpers
 * (stringWidth/truncate/padToWidth) expect *plain* text, so always truncate
 * first and style afterwards.
 */

const CSI = '\x1b['

export const cursor = {
  hide: `${CSI}?25l`,
  home: `${CSI}H`,
  show: `${CSI}?25h`,
  to: (row: number, col: number) => `${CSI}${row};${col}H`,
}

export const screen = {
  alt: `${CSI}?1049h`,
  clear: `${CSI}2J`,
  clearDown: `${CSI}J`,
  clearLine: `${CSI}K`,
  main: `${CSI}?1049l`,
}

const sgr = (open: number, close: number) => (text: string) =>
  `${CSI}${open}m${text}${CSI}${close}m`

export const bold = sgr(1, 22)
export const dim = sgr(2, 22)
export const italic = sgr(3, 23)
export const underline = sgr(4, 24)
export const reverse = sgr(7, 27)

export const fg = (color: number) => (text: string) =>
  `${CSI}38;5;${color}m${text}${CSI}39m`

export const bg = (color: number) => (text: string) =>
  `${CSI}48;5;${color}m${text}${CSI}49m`

// Otter's terminal palette (xterm-256 indexes)
export const palette = {
  accent: 208, // otter orange
  border: 240,
  danger: 203,
  muted: 245,
  star: 220,
  tag: 114,
  url: 75,
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ANSI escape sequences is the point
const ansiPattern = /\x1b\[[0-9;?]*[A-Za-z]/g

export const stripAnsi = (text: string) => text.replace(ansiPattern, '')

const isZeroWidth = (codePoint: number) =>
  (codePoint >= 0x300 && codePoint <= 0x36f) || // combining marks
  codePoint === 0x200d || // zero-width joiner
  (codePoint >= 0xfe00 && codePoint <= 0xfe0f) // variation selectors

const isWide = (codePoint: number) =>
  codePoint >= 0x1100 &&
  (codePoint <= 0x115f || // Hangul Jamo
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) || // CJK
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Hangul syllables
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK compat ideographs
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) || // CJK compat forms
    (codePoint >= 0xff00 && codePoint <= 0xff60) || // fullwidth forms
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) || // emoji
    (codePoint >= 0x20000 && codePoint <= 0x3fffd))

export const charWidth = (codePoint: number) => {
  if (isZeroWidth(codePoint)) {
    return 0
  }

  return isWide(codePoint) ? 2 : 1
}

/** Display width of a string (ANSI codes stripped, wide chars counted as 2). */
export const stringWidth = (text: string) => {
  let width = 0

  for (const char of stripAnsi(text)) {
    width += charWidth(char.codePointAt(0) ?? 0)
  }

  return width
}

/** Truncate *plain* text to a display width, adding an ellipsis when cut. */
export const truncate = (text: string, maxWidth: number) => {
  if (maxWidth <= 0) {
    return ''
  }

  if (stringWidth(text) <= maxWidth) {
    return text
  }

  let width = 0
  let result = ''

  for (const char of text) {
    const nextWidth = width + charWidth(char.codePointAt(0) ?? 0)

    if (nextWidth > maxWidth - 1) {
      break
    }

    result += char
    width = nextWidth
  }

  return `${result}…`
}

/** Pad (styled or plain) text with trailing spaces up to a display width. */
export const padToWidth = (text: string, width: number) => {
  const padding = width - stringWidth(text)

  return padding > 0 ? text + ' '.repeat(padding) : text
}
