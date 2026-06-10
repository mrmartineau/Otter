import { describe, expect, it } from 'vitest'
import { padToWidth, stringWidth, stripAnsi, truncate } from './ansi.ts'

describe('stripAnsi', () => {
  it('removes SGR sequences', () => {
    expect(stripAnsi('\x1b[1mhello\x1b[22m')).toBe('hello')
    expect(stripAnsi('\x1b[38;5;208motter\x1b[39m')).toBe('otter')
  })

  it('leaves plain text alone', () => {
    expect(stripAnsi('plain')).toBe('plain')
  })
})

describe('stringWidth', () => {
  it('counts ascii as 1 column', () => {
    expect(stringWidth('otter')).toBe(5)
  })

  it('ignores ansi codes', () => {
    expect(stringWidth('\x1b[1motter\x1b[22m')).toBe(5)
  })

  it('counts emoji and CJK as 2 columns', () => {
    expect(stringWidth('🦦')).toBe(2)
    expect(stringWidth('日本')).toBe(4)
  })
})

describe('truncate', () => {
  it('returns short strings untouched', () => {
    expect(truncate('otter', 10)).toBe('otter')
  })

  it('cuts long strings with an ellipsis', () => {
    expect(truncate('otter bookmarks', 8)).toBe('otter b…')
  })

  it('handles zero width', () => {
    expect(truncate('otter', 0)).toBe('')
  })
})

describe('padToWidth', () => {
  it('pads to the requested display width', () => {
    expect(padToWidth('ab', 5)).toBe('ab   ')
  })

  it('accounts for ansi codes when padding', () => {
    expect(padToWidth('\x1b[1mab\x1b[22m', 4)).toBe('\x1b[1mab\x1b[22m  ')
  })

  it('never pads negatively', () => {
    expect(padToWidth('abcdef', 3)).toBe('abcdef')
  })
})
