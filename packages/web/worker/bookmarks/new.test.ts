import { beforeEach, describe, expect, it, vi } from 'vitest'

const scrapeMetadata = vi.fn()

vi.mock('../scraper/index', () => ({ scrapeMetadata }))

const { scrapedBookmark } = await import('./new')

const dbTags = [{ count: 3, tag: 'design' }]

beforeEach(() => {
  scrapeMetadata.mockReset()
})

describe('scrapedBookmark', () => {
  it('prefers scraped details and tidies the url', async () => {
    scrapeMetadata.mockResolvedValue({
      cleaned_url: 'https://example.com/post',
      description: 'Scraped description',
      feeds: 'https://example.com/feed.xml',
      image: 'https://example.com/og.png',
      title: 'Scraped title about design',
      url: 'https://example.com/post?utm_source=x',
      urlType: 'article',
    })

    const result = await scrapedBookmark(
      'https://example.com/post?utm_source=x',
      { title: 'Tab title' },
      dbTags,
    )

    expect(result).toMatchObject({
      description: 'Scraped description',
      title: 'Scraped title about design',
      type: 'article',
      url: 'https://example.com/post',
    })
    expect(result.tags).toContain('design')
  })

  it('still saves the bookmark when the site blocks the scraper', async () => {
    // cititec.com answers a server-side fetch with 403 behind its bot wall.
    scrapeMetadata.mockRejectedValue(
      new Error('Status 403 requesting https://cititec.com/'),
    )

    const result = await scrapedBookmark(
      'https://cititec.com/',
      { title: 'Cititec' },
      dbTags,
    )

    expect(result.url).toBe('https://cititec.com/')
    expect(result.title).toBe('Cititec')
    expect(result.type).toBe('link')
  })

  it('guesses a type from the url when the scrape fails', async () => {
    scrapeMetadata.mockRejectedValue(new Error('Status 403'))

    const result = await scrapedBookmark(
      'https://www.youtube.com/watch?v=abc123',
      {},
      dbTags,
    )

    expect(result.type).toBe('video')
  })

  it('keeps caller tags when the scrape fails', async () => {
    scrapeMetadata.mockRejectedValue(new Error('nope'))

    const result = await scrapedBookmark(
      'https://example.com/',
      { tags: ['reading'] },
      dbTags,
    )

    expect(result.tags).toEqual(['reading'])
  })
})
