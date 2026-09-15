import { describe, expect, it } from 'vitest'
import { readingTimeSeconds, toReadingPatch } from './reader'

describe('toReadingPatch', () => {
  it('never rewinds progress and clamps to 1', () => {
    const current = { progress: 0.6, state: 'ready' as const }
    expect(toReadingPatch(current, { progress: 0.3 }).progress).toBe(0.6)
    expect(toReadingPatch(current, { progress: 0.9 }).progress).toBe(0.9)
    expect(toReadingPatch(current, { progress: 7 }).progress).toBe(1)
  })

  it('rejects unknown states and ignores unrelated keys', () => {
    const current = { progress: 0, state: 'ready' as const }
    expect(() => toReadingPatch(current, { state: 'nope' })).toThrow()
    expect(toReadingPatch(current, { state: 'archived', title: 'x' })).toEqual({
      state: 'archived',
    })
  })
})

describe('readingTimeSeconds', () => {
  it('assumes 200 words a minute', () => {
    expect(readingTimeSeconds(1000)).toBe(300)
    expect(readingTimeSeconds(0)).toBe(0)
  })
})
