import { describe, expect, it } from 'vitest'
import { buildOpml, parseOpml } from './opml'

const sampleOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Subscriptions</title>
  </head>
  <body>
    <outline text="Tech" title="Tech">
      <outline type="rss" text="Daring Fireball" title="Daring Fireball" xmlUrl="https://daringfireball.net/feeds/main" htmlUrl="https://daringfireball.net/"/>
      <outline type="rss" text="Zander Martineau" xmlUrl="https://zander.wtf/rss.xml" htmlUrl="https://zander.wtf"/>
    </outline>
    <outline type="rss" text="Single feed" xmlUrl="https://example.com/feed.xml"/>
  </body>
</opml>
`

describe('parseOpml', () => {
  it('parses feeds and uses parent outlines as folders', () => {
    const feeds = parseOpml(sampleOpml)

    expect(feeds).toEqual([
      {
        feedUrl: 'https://daringfireball.net/feeds/main',
        folder: 'Tech',
        siteUrl: 'https://daringfireball.net/',
        title: 'Daring Fireball',
      },
      {
        feedUrl: 'https://zander.wtf/rss.xml',
        folder: 'Tech',
        siteUrl: 'https://zander.wtf',
        title: 'Zander Martineau',
      },
      {
        feedUrl: 'https://example.com/feed.xml',
        folder: null,
        siteUrl: null,
        title: 'Single feed',
      },
    ])
  })

  it('parses a single top-level outline', () => {
    const feeds = parseOpml(`<opml version="2.0"><body>
      <outline type="rss" text="One" xmlUrl="https://one.example/feed"/>
    </body></opml>`)

    expect(feeds).toHaveLength(1)
    expect(feeds[0].feedUrl).toBe('https://one.example/feed')
    expect(feeds[0].folder).toBeNull()
  })

  it('joins nested folder names', () => {
    const feeds = parseOpml(`<opml version="2.0"><body>
      <outline text="News">
        <outline text="UK">
          <outline type="rss" text="BBC" xmlUrl="https://bbc.example/feed"/>
        </outline>
      </outline>
    </body></opml>`)

    expect(feeds[0].folder).toBe('News/UK')
  })

  it('de-dupes feeds by url', () => {
    const feeds = parseOpml(`<opml version="2.0"><body>
      <outline type="rss" text="One" xmlUrl="https://one.example/feed"/>
      <outline type="rss" text="One again" xmlUrl="https://one.example/feed"/>
    </body></opml>`)

    expect(feeds).toHaveLength(1)
  })

  it('returns an empty list for invalid documents', () => {
    expect(parseOpml('not xml at all')).toEqual([])
    expect(parseOpml('<html><body>nope</body></html>')).toEqual([])
  })
})

describe('buildOpml', () => {
  it('round-trips through parseOpml', () => {
    const feeds = parseOpml(sampleOpml)
    const rebuilt = buildOpml(feeds)
    expect(parseOpml(rebuilt)).toEqual(feeds)
  })

  it('escapes XML entities', () => {
    const opml = buildOpml([
      {
        feedUrl: 'https://example.com/feed?a=1&b=2',
        folder: null,
        siteUrl: null,
        title: 'Tom & "Jerry" <show>',
      },
    ])

    expect(opml).toContain('Tom &amp; &quot;Jerry&quot; &lt;show&gt;')
    expect(opml).toContain('https://example.com/feed?a=1&amp;b=2')

    const feeds = parseOpml(opml)
    expect(feeds[0].title).toBe('Tom & "Jerry" <show>')
    expect(feeds[0].feedUrl).toBe('https://example.com/feed?a=1&b=2')
  })
})
