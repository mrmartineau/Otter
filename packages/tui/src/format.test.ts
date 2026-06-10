import { describe, expect, it } from 'vitest'
import { domain, formatCount, relativeTime, wrapText } from './format.ts'

const now = new Date('2026-06-10T12:00:00Z')

describe('relativeTime', () => {
  it('handles just-now', () => {
    expect(relativeTime('2026-06-10T11:59:50Z', now)).toBe('now')
  })

  it('formats minutes, hours, days, weeks, months and years', () => {
    expect(relativeTime('2026-06-10T11:55:00Z', now)).toBe('5m')
    expect(relativeTime('2026-06-10T09:00:00Z', now)).toBe('3h')
    expect(relativeTime('2026-06-08T12:00:00Z', now)).toBe('2d')
    expect(relativeTime('2026-05-20T12:00:00Z', now)).toBe('3w')
    expect(relativeTime('2026-02-10T12:00:00Z', now)).toBe('4mo')
    expect(relativeTime('2024-06-10T12:00:00Z', now)).toBe('2y')
  })

  it('returns empty for invalid dates', () => {
    expect(relativeTime('not-a-date', now)).toBe('')
  })
})

describe('domain', () => {
  it('extracts the hostname without www', () => {
    expect(domain('https://www.example.com/a/b?c=1')).toBe('example.com')
    expect(domain('https://zander.wtf')).toBe('zander.wtf')
  })

  it('returns empty for invalid or missing urls', () => {
    expect(domain('not a url')).toBe('')
    expect(domain(null)).toBe('')
  })
})

describe('formatCount', () => {
  it('adds thousand separators', () => {
    expect(formatCount(1234)).toBe('1,234')
  })
})

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapText('the quick brown fox jumps', 10)).toEqual([
      'the quick',
      'brown fox',
      'jumps',
    ])
  })

  it('hard-breaks words longer than the width', () => {
    expect(wrapText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('preserves paragraph breaks', () => {
    expect(wrapText('one\n\ntwo', 10)).toEqual(['one', '', 'two'])
  })

  it('returns nothing for zero width', () => {
    expect(wrapText('anything', 0)).toEqual([])
  })
})
