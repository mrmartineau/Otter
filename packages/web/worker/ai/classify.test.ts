import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyBookmark } from './classify'

const aiRun = vi.fn()
const context = { env: { AI: { run: aiRun } } } as unknown as Context

// Counts, not order, decide which spelling of an idea survives.
const existingTags = [
  { count: 349, tag: 'app:mac' },
  { count: 23, tag: 'mac' },
  { count: 21, tag: 'app' },
  { count: 2, tag: 'mac:app' },
  { count: 51, tag: 'components:shadcn' },
  { count: 40, tag: 'components' },
  { count: 141, tag: 'CSS' },
  { count: 24, tag: 'css' },
  { count: 46, tag: 'CLI' },
  { count: 1, tag: 'ghostty' },
  { count: 12, tag: 'like:youtube' },
  { count: 99, tag: 'Untagged' },
  ...Array.from({ length: 60 }, (_, index) => ({
    count: 60 - index,
    tag: `popular-${index}`,
  })),
]

const classify = (tags: string[], type = 'link') => {
  aiRun.mockResolvedValue({ response: { tags, type } })

  return classifyBookmark({
    context,
    currentType: 'link',
    description: 'A fast terminal emulator, driven from the CLI',
    existingTags,
    title: 'Ghostty',
    url: 'https://ghostty.org/',
  })
}

beforeEach(() => {
  aiRun.mockReset()
})

describe('classifyBookmark', () => {
  const shortlist = () =>
    aiRun.mock.calls[0][1].response_format.json_schema.properties.tags.items
      .enum as string[]

  it('shows the model a shortlist, not the whole vocabulary', async () => {
    await classify([])

    expect(shortlist()).toContain('CLI')
    expect(shortlist()).toContain('popular-0')
    expect(shortlist()).not.toContain('popular-40')
  })

  it('offers app:mac and never the pieces it is made of', async () => {
    await classify([])

    // 349 uses against 23, 21 and 2, so these are three spellings of one idea.
    expect(shortlist()).toContain('app:mac')
    expect(shortlist()).not.toContain('mac')
    expect(shortlist()).not.toContain('app')
    expect(shortlist()).not.toContain('mac:app')
  })

  it('keeps a broad tag that is genuinely its own idea', async () => {
    await classify([])

    // components (40) against components:shadcn (51) is nowhere near 5x, so
    // both survive — not every component library is shadcn.
    expect(shortlist()).toContain('components')
    expect(shortlist()).toContain('components:shadcn')
  })

  it('offers one spelling of a tag, the most-used one', async () => {
    await classify([])

    expect(shortlist()).toContain('CSS')
    expect(shortlist()).not.toContain('css')
  })

  it('never offers like: tags or Untagged', async () => {
    await classify([])

    expect(shortlist()).not.toContain('like:youtube')
    expect(shortlist()).not.toContain('Untagged')
  })

  it('limits the answer to the shortlist', async () => {
    await classify([])

    const schema = aiRun.mock.calls[0][1].response_format.json_schema

    expect(schema.properties.tags.maxItems).toBe(5)
  })

  it('answers with the spelling already in the database', async () => {
    // The model says "cli"; saving that would sit beside the user's "CLI".
    const result = await classify(['cli'])

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
  })

  it('keeps the most-used spelling when the user has both', async () => {
    // "CSS" is used more than "css", so it is the one that comes back.
    const result = await classify(['css', 'CSS'])

    expect(result.tags).toEqual([{ isNew: false, name: 'CSS' }])
  })

  it('drops bookmark types, like: tags and repeats', async () => {
    const result = await classify(['video', 'like:youtube', 'CLI', 'cli'])

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
  })

  it('keeps the current type when the model returns a bad one', async () => {
    const result = await classify([], 'spaceship')

    expect(result.type).toBe('link')
  })

  it('takes a new tag from newTags and marks it new', async () => {
    aiRun.mockResolvedValue({
      response: { newTags: ['terminal-emulator'], tags: [], type: 'link' },
    })

    const result = await classifyBookmark({
      context,
      currentType: 'link',
      description: '',
      existingTags,
      title: 'Ghostty',
      url: 'https://ghostty.org/',
    })

    expect(result.tags).toEqual([{ isNew: true, name: 'terminal-emulator' }])
  })
})
