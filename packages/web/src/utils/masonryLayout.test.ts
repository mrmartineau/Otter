import { describe, expect, it } from 'vitest'
import { masonryLayout } from './masonryLayout'

describe('masonryLayout', () => {
  it('fills the first row in order, then the shortest column', () => {
    const { positions, height } = masonryLayout([100, 50, 80, 30], 3, 10)
    expect(positions).toEqual([
      { column: 0, top: 0 },
      { column: 1, top: 0 },
      { column: 2, top: 0 },
      // Column 1 is the shortest (50 + gap)
      { column: 1, top: 60 },
    ])
    expect(height).toBe(100)
  })

  it('does not move earlier cards when more are added', () => {
    const first = masonryLayout([100, 50, 80], 3, 10).positions
    const more = masonryLayout([100, 50, 80, 40, 40], 3, 10).positions
    expect(more.slice(0, 3)).toEqual(first)
  })

  it('handles no cards', () => {
    expect(masonryLayout([], 3, 10)).toEqual({ height: 0, positions: [] })
  })
})
