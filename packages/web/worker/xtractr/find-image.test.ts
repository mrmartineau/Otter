import { parseHTML } from 'linkedom'
import { describe, expect, it } from 'vitest'
import { findImage } from './index'

const doc = (head: string) =>
  parseHTML(`<html><head>${head}</head><body></body></html>`)
    .document as unknown as Document

describe('findImage', () => {
  it('reads og:image written as a name, which Defuddle misses', () => {
    expect(
      findImage(doc('<meta name="og:image" content="https://a.com/og.png">'), 'https://a.com/post'),
    ).toBe('https://a.com/og.png')
  })

  it('resolves a relative image against the page', () => {
    expect(
      findImage(doc('<meta property="twitter:image" content="/img/card.jpg">'), 'https://a.com/post/'),
    ).toBe('https://a.com/img/card.jpg')
  })

  it('returns an empty string when there is no image', () => {
    expect(findImage(doc('<title>x</title>'), 'https://a.com')).toBe('')
  })
})
