import { describe, expect, it } from 'vitest'
import { urlKey } from './urlKey'

describe('urlKey', () => {
  it('drops scheme, www, query, fragment and trailing slash', () => {
    expect(urlKey('https://www.Example.com/Foo/?a=1#top')).toBe(
      'example.com/foo',
    )
  })

  it('matches what clients send (host + path)', () => {
    expect(urlKey('example.com/foo')).toBe(urlKey('http://example.com/foo/'))
  })

  it('keeps the port and subdomains', () => {
    expect(urlKey('https://blog.example.com:8080/a')).toBe(
      'blog.example.com:8080/a',
    )
  })

  it('reduces a bare host to the host', () => {
    expect(urlKey('https://example.com/')).toBe('example.com')
  })
})
