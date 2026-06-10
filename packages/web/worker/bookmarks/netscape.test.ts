import { describe, expect, it } from 'vitest'
import { parseNetscapeBookmarks, serializeNetscapeBookmarks } from './netscape'

const chromeExport = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" LAST_MODIFIED="1700000001" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://example.com/" ADD_DATE="1700000002" ICON="data:image/png;base64,xyz">Example &amp; Friends</A>
        <DT><H3 ADD_DATE="1700000003">Dev Tools</H3>
        <DL><p>
            <DT><A HREF="https://github.com/" ADD_DATE="1700000004">GitHub</A>
            <DT><A HREF="https://developer.mozilla.org/" ADD_DATE="1700000005">MDN</A>
        </DL><p>
    </DL><p>
</DL><p>
`

const pinboardExport = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Pinboard Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
<DT><A HREF="https://example.org/article" ADD_DATE="1600000000" PRIVATE="1" TOREAD="0" TAGS="reading,web dev">A Great Article</A>
<DD>Some notes about the article
<DT><A HREF="https://example.org/other" ADD_DATE="1600000001" PRIVATE="0" TOREAD="0" TAGS="">Another one</A>
</DL></p>
`

describe('parseNetscapeBookmarks', () => {
  it('parses a Chrome-style nested export, mapping folders to tags', () => {
    const items = parseNetscapeBookmarks(chromeExport)

    expect(items).toHaveLength(3)
    expect(items[0]).toEqual({
      createdAt: new Date(1700000002 * 1000),
      description: null,
      tags: [],
      title: 'Example & Friends',
      url: 'https://example.com/',
    })
    // nested folder becomes a tag; the root "Bookmarks bar" folder does not
    expect(items[1].url).toBe('https://github.com/')
    expect(items[1].tags).toEqual(['Dev Tools'])
    expect(items[2].tags).toEqual(['Dev Tools'])
  })

  it('parses Pinboard-style exports with TAGS attributes and descriptions', () => {
    const items = parseNetscapeBookmarks(pinboardExport)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      createdAt: new Date(1600000000 * 1000),
      description: 'Some notes about the article',
      tags: ['reading', 'web dev'],
      title: 'A Great Article',
      url: 'https://example.org/article',
    })
    expect(items[1].description).toBeNull()
    expect(items[1].tags).toEqual([])
  })

  it('skips non-web protocols and duplicate urls', () => {
    const items = parseNetscapeBookmarks(`
      <DL><p>
        <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
        <DT><A HREF="place:type=6">Firefox internal</A>
        <DT><A HREF="https://example.com/">First</A>
        <DT><A HREF="https://example.com/">Duplicate</A>
      </DL><p>
    `)

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('First')
  })

  it('handles missing ADD_DATE, attribute-less anchors and entities', () => {
    const items = parseNetscapeBookmarks(`
      <DL><p>
        <DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="">Caf&eacute;&#233; &quot;quoted&quot;</A>
      </DL><p>
    `)

    expect(items).toHaveLength(1)
    expect(items[0].url).toBe('https://example.com/?a=1&b=2')
    // unknown named entities are left as-is, numeric ones are decoded
    expect(items[0].title).toBe('Caf&eacute;é "quoted"')
    expect(items[0].createdAt).toBeNull()
  })

  it('normalises millisecond and microsecond timestamps', () => {
    const items = parseNetscapeBookmarks(`
      <DL><p>
        <DT><A HREF="https://a.com/" ADD_DATE="1700000000000">ms</A>
        <DT><A HREF="https://b.com/" ADD_DATE="1700000000000000">µs</A>
      </DL><p>
    `)

    expect(items[0].createdAt).toEqual(new Date(1700000000 * 1000))
    expect(items[1].createdAt).toEqual(new Date(1700000000 * 1000))
  })

  it('returns an empty array for content with no bookmarks', () => {
    expect(parseNetscapeBookmarks('<html><body>hello</body></html>')).toEqual(
      [],
    )
  })
})

describe('serializeNetscapeBookmarks', () => {
  it('produces a Netscape file that round-trips through the parser', () => {
    const createdAt = new Date(1700000000 * 1000)
    const html = serializeNetscapeBookmarks([
      {
        createdAt,
        description: 'Notes with <angle> & "quotes"',
        modifiedAt: createdAt,
        public: false,
        tags: ['reading', 'web dev'],
        title: 'Example & Friends',
        url: 'https://example.com/?a=1&b=2',
      },
      {
        createdAt,
        description: null,
        modifiedAt: createdAt,
        public: true,
        tags: null,
        title: null,
        url: 'https://no-title.com/',
      },
    ])

    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('PRIVATE="1"')
    expect(html).toContain('PRIVATE="0"')

    const items = parseNetscapeBookmarks(html)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      createdAt,
      description: 'Notes with <angle> & "quotes"',
      tags: ['reading', 'web dev'],
      title: 'Example & Friends',
      url: 'https://example.com/?a=1&b=2',
    })
    // bookmarks without a title fall back to the url
    expect(items[1].title).toBe('https://no-title.com/')
  })
})
