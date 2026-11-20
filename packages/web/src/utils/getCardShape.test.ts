import { describe, expect, it } from 'vitest'
import { getCardShape } from './getCardShape'

const shape = (
  type: Parameters<typeof getCardShape>[0]['type'],
  url: string | null = 'https://example.com',
  note: string | null = null,
) => getCardShape({ note, type, url })

describe('getCardShape', () => {
  it('maps media types to their own shapes', () => {
    expect(shape('video')).toBe('video')
    expect(shape('image')).toBe('picture')
    expect(shape('audio')).toBe('audio')
    expect(shape('note')).toBe('note')
  })

  it('gives things with a picture the object shape', () => {
    for (const type of ['book', 'event', 'game', 'place', 'product', 'recipe'] as const) {
      expect(shape(type)).toBe('object')
    }
  })

  it('treats a note with no url as a note, whatever its type', () => {
    expect(shape('link', null, 'a thought')).toBe('note')
    expect(shape(null, null, 'a thought')).toBe('note')
  })

  it('falls back to article', () => {
    expect(shape('article')).toBe('article')
    expect(shape('link')).toBe('article')
    expect(shape(null)).toBe('article')
    expect(shape('link', null, null)).toBe('article')
  })
})
