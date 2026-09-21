import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const scrapeMetadata = vi.fn()
const aiRun = vi.fn()

vi.mock('../scraper/index', () => ({ scrapeMetadata }))

const { scrapedBookmark } = await import('./new')

const dbTags = [{ count: 3, tag: 'design' }]

const context = { env: { AI: { run: aiRun } } } as unknown as Context

beforeEach(() => {
  scrapeMetadata.mockReset()
  aiRun.mockReset()
  aiRun.mockResolvedValue({ response: { tags: ['design'], type: 'article' } })
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
      context,
    )

    expect(result).toMatchObject({
      description: 'Scraped description',
      title: 'Scraped title about design',
      type: 'article',
      url: 'https://example.com/post',
    })
    expect(result.tags).toContain('design')
  })

  it('takes the type the classifier picks over the one guessed from the url', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'A quick weeknight miso ramen',
      title: 'Miso ramen recipe',
      url: 'https://example.com/miso-ramen',
      urlType: 'link',
    })
    aiRun.mockResolvedValue({ response: { tags: [], type: 'recipe' } })

    const result = await scrapedBookmark(
      'https://example.com/miso-ramen',
      {},
      dbTags,
      context,
    )

    expect(result.type).toBe('recipe')
  })

  it('falls back to word matching when the classifier fails', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'All about design',
      title: 'Scraped title',
      url: 'https://example.com/post',
      urlType: 'article',
    })
    aiRun.mockRejectedValue(new Error('AI unavailable'))

    const result = await scrapedBookmark(
      'https://example.com/post',
      {},
      dbTags,
      context,
    )

    expect(result.tags).toEqual(['design'])
    expect(result.type).toBe('article')
  })

  it('still saves the bookmark when the site blocks the scraper', async () => {
    // cititec.com answers a server-side fetch with 403 behind its bot wall.
    scrapeMetadata.mockRejectedValue(
      new Error('Status 403 requesting https://cititec.com/'),
    )
    aiRun.mockResolvedValue({ response: { tags: [], type: 'link' } })

    const result = await scrapedBookmark(
      'https://cititec.com/',
      { title: 'Cititec' },
      dbTags,
      context,
    )

    expect(result.url).toBe('https://cititec.com/')
    expect(result.title).toBe('Cititec')
    expect(result.type).toBe('link')
  })

  it('guesses a type from the url when the scrape fails', async () => {
    scrapeMetadata.mockRejectedValue(new Error('Status 403'))
    aiRun.mockRejectedValue(new Error('AI unavailable'))

    const result = await scrapedBookmark(
      'https://www.youtube.com/watch?v=abc123',
      {},
      dbTags,
      context,
    )

    expect(result.type).toBe('video')
  })

  it('keeps caller tags when the scrape fails', async () => {
    scrapeMetadata.mockRejectedValue(new Error('nope'))
    aiRun.mockRejectedValue(new Error('AI unavailable'))

    const result = await scrapedBookmark(
      'https://example.com/',
      { tags: ['reading'] },
      dbTags,
      context,
    )

    expect(result.tags).toEqual(['reading'])
  })
})
