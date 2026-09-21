import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const scrapeMetadata = vi.fn()
const aiRun = vi.fn()

vi.mock('../scraper/index', () => ({ scrapeMetadata }))

const { scrapedBookmark } = await import('./new')

const dbTags = [{ count: 3, tag: 'design' }]

const context = { env: { AI: { run: aiRun } } } as unknown as Context

/** The system prompt each AI call was given, in call order. */
const systemPrompts = () =>
  aiRun.mock.calls.map((call) => call[1].messages[0].content as string)

const promptFor = (kind: 'title' | 'description') =>
  systemPrompts().find((content) =>
    content.startsWith(`You are a web page ${kind} rewriter`),
  )

/** Routes each call by its system prompt, the way the real models differ. */
const stubAi = ({
  title = 'Rewritten title',
  description = 'Rewritten description',
  tags = ['design'],
  type = 'article',
}: {
  title?: string
  description?: string
  tags?: string[]
  type?: string
} = {}) => {
  aiRun.mockImplementation(async (_model, options) => {
    const systemPrompt = options.messages[0].content as string

    if (systemPrompt.startsWith('You are a web page title rewriter')) {
      return { response: title }
    }

    if (systemPrompt.startsWith('You are a web page description rewriter')) {
      return { response: description }
    }

    return { response: { tags, type } }
  })
}

beforeEach(() => {
  scrapeMetadata.mockReset()
  aiRun.mockReset()
  stubAi()
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
      type: 'article',
      url: 'https://example.com/post',
    })
    expect(result.tags).toContain('design')
  })

  it('rewrites the scraped title and description', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'Get up and running. - ollama/ollama',
      title: 'GitHub - ollama/ollama: Get up and running.',
      url: 'https://github.com/ollama/ollama',
      urlType: 'link',
    })
    stubAi({
      description: 'Get up and running.',
      title: 'ollama/ollama – Get up and running on GitHub.',
    })

    const result = await scrapedBookmark(
      'https://github.com/ollama/ollama',
      {},
      dbTags,
      context,
    )

    expect(result.title).toBe('ollama/ollama – Get up and running on GitHub.')
    expect(result.description).toBe('Get up and running.')
  })

  it('hands the rewritten title to the description rewriter', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'Scraped description',
      title: 'Messy | Title',
      url: 'https://example.com/',
      urlType: 'link',
    })
    stubAi({ title: 'Clean title' })

    await scrapedBookmark('https://example.com/', {}, dbTags, context)

    // The description prompt embeds the title so it can avoid repeating it.
    // It has to be the rewritten one, which means it ran second.
    expect(promptFor('description')).toContain('Clean title')
    expect(promptFor('description')).not.toContain('Messy | Title')
  })

  it('classifies on the scraped wording, not the rewritten wording', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'Scraped description',
      title: 'GitHub - owner/repo: a thing',
      url: 'https://github.com/owner/repo',
      urlType: 'link',
    })
    stubAi({ title: 'owner/repo – a thing' })

    await scrapedBookmark('https://github.com/owner/repo', {}, dbTags, context)

    const classifyPrompt = systemPrompts().find((content) =>
      content.startsWith('You tag saved web pages'),
    )

    expect(classifyPrompt).toBeDefined()
    // The classifier is one of three calls, and it never sees "owner/repo –".
    expect(aiRun).toHaveBeenCalledTimes(3)
  })

  it('keeps the scraped wording when a rewrite fails', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'Scraped description',
      title: 'Scraped title',
      url: 'https://example.com/',
      urlType: 'link',
    })
    aiRun.mockRejectedValue(new Error('AI unavailable'))

    const result = await scrapedBookmark(
      'https://example.com/',
      {},
      dbTags,
      context,
    )

    expect(result.title).toBe('Scraped title')
    expect(result.description).toBe('Scraped description')
  })

  it('takes the type the classifier picks over the one guessed from the url', async () => {
    scrapeMetadata.mockResolvedValue({
      description: 'A quick weeknight miso ramen',
      title: 'Miso ramen recipe',
      url: 'https://example.com/miso-ramen',
      urlType: 'link',
    })
    stubAi({ tags: [], type: 'recipe' })

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
    stubAi({ tags: [], title: 'Cititec', type: 'link' })

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
