/** Pure text formatting helpers. */

const UNITS: [seconds: number, suffix: string][] = [
  [60, 's'],
  [3600, 'm'],
  [86400, 'h'],
  [604800, 'd'],
  [2629800, 'w'],
  [31557600, 'mo'],
]

/** Compact relative time: "now", "5m", "3h", "2d", "6w", "4mo", "2y". */
export const relativeTime = (iso: string, now = new Date()) => {
  const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000)

  if (Number.isNaN(seconds)) {
    return ''
  }

  if (seconds < 45) {
    return 'now'
  }

  let previousThreshold = 60

  for (const [threshold, suffix] of UNITS.slice(1)) {
    if (seconds < threshold) {
      return `${Math.round(seconds / previousThreshold)}${suffix}`
    }

    previousThreshold = threshold
  }

  return `${Math.round(seconds / 31557600)}y`
}

/** Hostname of a URL without the www. prefix; '' when unparseable. */
export const domain = (url: string | null | undefined) => {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export const formatCount = (value: number) => value.toLocaleString('en-US')

/** Greedy word-wrap of plain text into lines no wider than `width`. */
export const wrapText = (text: string, width: number): string[] => {
  if (width <= 0) {
    return []
  }

  const lines: string[] = []

  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    let line = ''

    for (const word of paragraph.split(/\s+/)) {
      if (!line) {
        line = word
      } else if (`${line} ${word}`.length <= width) {
        line = `${line} ${word}`
      } else {
        lines.push(line)
        line = word
      }

      while (line.length > width) {
        lines.push(line.slice(0, width))
        line = line.slice(width)
      }
    }

    lines.push(line)
  }

  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines
}
