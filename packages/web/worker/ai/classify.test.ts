import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyBookmark } from './classify'

const aiRun = vi.fn()
const context = { env: { AI: { run: aiRun } } } as unknown as Context

// Most-used first, the order `/api/tags` returns.
const existingTags = [
  ...Array.from({ length: 60 }, (_, index) => `popular-${index}`),
  'CLI',
  'ghostty',
  'cli',
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
  it('shows the model a shortlist, not the whole vocabulary', async () => {
    await classify([])

    const prompt = aiRun.mock.calls[0][1].messages[0].content as string

    // Word matches ride at the front, then the 40 most-used tags.
    expect(prompt).toContain('CLI, ghostty, cli, popular-0')
    expect(prompt).not.toContain('popular-40')
  })

  it('limits the answer to the shortlist', async () => {
    await classify([])

    const schema = aiRun.mock.calls[0][1].response_format.json_schema

    expect(schema.properties.tags.items.enum).toContain('CLI')
    expect(schema.properties.tags.maxItems).toBe(5)
  })

  it('answers with the spelling already in the database', async () => {
    // The model says "cli"; saving that would sit beside the user's "CLI".
    const result = await classify(['cli'])

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
  })

  it('keeps the most-used spelling when the user has both', async () => {
    // "CLI" is used more than "cli", so it is the one that comes back.
    const result = await classify(['cli', 'CLI'])

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
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
