import { describe, expect, it } from 'vitest'
import { feedTextToJson } from './rss-to-json'

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="html">My &amp; Blog</title>
  <link rel="alternate" href="https://example.com"/>
  <entry>
    <title type="html">Post &lt;one&gt;</title>
    <link rel="alternate" href="https://example.com/1"/>
    <link rel="edit" href="https://example.com/1/edit"/>
    <updated>2026-06-01T00:00:00Z</updated>
    <content type="html">body</content>
  </entry>
  <entry>
    <title>Plain post</title>
    <link href="https://example.com/2"/>
    <updated>2026-06-02T00:00:00Z</updated>
  </entry>
</feed>`

const rss = `<?xml version="1.0"?>
<rss><channel>
  <title>RSS Blog</title>
  <link>https://rss.example.com</link>
  <item><title>RSS item</title><link>https://rss.example.com/a</link><pubDate>Wed, 02 Oct 2024 13:00:00 GMT</pubDate></item>
</channel></rss>`

describe('feedTextToJson', () => {
  it('unwraps Atom title/content with type attributes to strings', () => {
    const feed = feedTextToJson(atom)
    expect(feed).toBeDefined()
    expect(feed?.feed.title).toBe('My & Blog')

    const [first, second] = feed?.entries ?? []
    // every rendered field must be a plain string, never an XML-attr object
    for (const entry of feed?.entries ?? []) {
      expect(typeof entry.title).toBe('string')
      expect(typeof entry.link).toBe('string')
    }
    expect(first.title).toBe('Post <one>')
    expect(first.content).toBe('body')
    // prefers the alternate link over the edit link
    expect(first.link).toBe('https://example.com/1')
    expect(second.title).toBe('Plain post')
    expect(second.link).toBe('https://example.com/2')
  })

  it('parses RSS channel/item to strings', () => {
    const feed = feedTextToJson(rss)
    expect(feed?.feed.title).toBe('RSS Blog')
    expect(feed?.feed.link).toBe('https://rss.example.com')
    const [item] = feed?.entries ?? []
    expect(item.title).toBe('RSS item')
    expect(item.link).toBe('https://rss.example.com/a')
  })
})
