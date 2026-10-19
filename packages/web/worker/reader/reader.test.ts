import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../../db/client'
import { classifyBookmark } from '../ai/classify'
import { autoTag, readingTimeSeconds, toReadingPatch } from './reader'

vi.mock('../ai/classify', () => ({ classifyBookmark: vi.fn() }))
vi.mock('../bookmarks/aggregates', () => ({
  getTagCounts: vi.fn(async () => [{ count: 3, tag: 'AI:Agent' }]),
}))

describe('toReadingPatch', () => {
  it('never rewinds progress and clamps to 1', () => {
    const current = { progress: 0.6, state: 'ready' as const }
    expect(toReadingPatch(current, { progress: 0.3 }).progress).toBe(0.6)
    expect(toReadingPatch(current, { progress: 0.9 }).progress).toBe(0.9)
    expect(toReadingPatch(current, { progress: 7 }).progress).toBe(1)
  })

  it('rejects unknown states and ignores unrelated keys', () => {
    const current = { progress: 0, state: 'ready' as const }
    expect(() => toReadingPatch(current, { state: 'nope' })).toThrow()
    expect(toReadingPatch(current, { state: 'archived', title: 'x' })).toEqual({
      state: 'archived',
    })
  })
})

describe('readingTimeSeconds', () => {
  it('assumes 200 words a minute', () => {
    expect(readingTimeSeconds(1000)).toBe(300)
    expect(readingTimeSeconds(0)).toBe(0)
  })
})

describe('autoTag', () => {
  const classify = vi.mocked(classifyBookmark)
  const context = {} as Context
  const bookmark = {
    description: 'Show an agent a problem instead of describing it.',
    id: 'b1',
    tags: [] as string[],
    title: 'Show an agent the problem.',
    type: 'article',
    url: 'https://scrawl.kitlangton.com/',
  } as unknown as Parameters<typeof autoTag>[3]

  let saved: Record<string, unknown> | undefined
  const db = {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        saved = values
        return {
          where: () => ({
            returning: async () => [{ ...bookmark, ...values }],
          }),
        }
      },
    }),
  } as unknown as Db

  beforeEach(() => {
    classify.mockReset()
    saved = undefined
  })

  it('saves the tags the classifier picks, keeping the type', async () => {
    classify.mockResolvedValue({
      tags: [{ isNew: false, name: 'AI:Agent' }],
      type: 'link',
    })

    const result = await autoTag(context, db, 'u1', bookmark)

    expect(classify.mock.calls[0][0]).toMatchObject({
      currentType: 'article',
      existingTags: [{ count: 3, tag: 'AI:Agent' }],
      title: 'Show an agent the problem.',
    })
    expect(saved?.tags).toEqual(['AI:Agent'])
    expect(saved).not.toHaveProperty('type')
    expect(result.tags).toEqual(['AI:Agent'])
  })

  it('leaves a bookmark that already has tags alone', async () => {
    const tagged = { ...bookmark, tags: ['CSS'] }

    expect(await autoTag(context, db, 'u1', tagged)).toBe(tagged)
    expect(classify).not.toHaveBeenCalled()
  })

  it('keeps the save when the classifier fails', async () => {
    classify.mockRejectedValue(new Error('AI unavailable'))

    expect(await autoTag(context, db, 'u1', bookmark)).toBe(bookmark)
    expect(saved).toBeUndefined()
  })
})
