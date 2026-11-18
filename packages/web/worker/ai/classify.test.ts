import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyBookmark } from './classify'
import { AI_CLASSIFY_MODEL, AI_DECISION_MODEL } from './consts'

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

type Clef = { tags?: Record<string, number>; type?: string }

/** Answers like Clef does: a choice and a probability for every option. */
const clefAnswer = ({ tags, type = 'link' }: Clef) => {
  const best = Object.entries(tags ?? {}).sort(([, a], [, b]) => b - a)[0]

  return {
    answers: {
      ...(tags && {
        tags: { choice: best?.[0], probabilities: tags, type: 'choice' },
      }),
      type: { choice: type, type: 'choice' },
    },
  }
}

const respond = (clef: Clef, newTag?: string) => {
  aiRun.mockImplementation(async (model: string) =>
    model === AI_DECISION_MODEL
      ? clefAnswer(clef)
      : { response: { tag: newTag ?? '' } },
  )
}

const classify = (
  tags: Record<string, number> = {},
  type = 'link',
  newTag?: string,
) => {
  respond({ tags, type }, newTag)

  return classifyBookmark({
    context,
    currentType: 'link',
    description: 'A fast terminal emulator, driven from the CLI',
    existingTags,
    title: 'Ghostty',
    url: 'https://ghostty.org/',
  })
}

const clefCall = () =>
  aiRun.mock.calls.find(([model]) => model === AI_DECISION_MODEL)?.[1]

const generatorCall = () =>
  aiRun.mock.calls.find(([model]) => model === AI_CLASSIFY_MODEL)?.[1]

beforeEach(() => {
  aiRun.mockReset()
})

describe('classifyBookmark', () => {
  const shortlist = () =>
    Object.keys(clefCall().questions.tags.criteria).filter(
      (tag) => tag !== '__none__',
    )

  it('shows the model a shortlist, not the whole vocabulary', async () => {
    await classify()

    expect(shortlist()).toContain('CLI')
    expect(shortlist()).toContain('popular-0')
    expect(shortlist()).not.toContain('popular-40')
  })

  it('offers a collection tag its child alone is named by', async () => {
    aiRun.mockResolvedValue(clefAnswer({ tags: { __none__: 1 } }))

    await classifyBookmark({
      context,
      currentType: 'link',
      description: 'Show an agent a problem instead of describing it.',
      existingTags: [...existingTags, { count: 1, tag: 'AI:Agent' }],
      title: 'Show an agent the problem.',
      url: 'https://scrawl.kitlangton.com/',
    })

    expect(shortlist()).toContain('AI:Agent')
  })

  it('offers app:mac and never the pieces it is made of', async () => {
    await classify()

    // 349 uses against 23, 21 and 2, so these are three spellings of one idea.
    expect(shortlist()).toContain('app:mac')
    expect(shortlist()).not.toContain('mac')
    expect(shortlist()).not.toContain('app')
    expect(shortlist()).not.toContain('mac:app')
  })

  it('keeps a broad tag that is genuinely its own idea', async () => {
    await classify()

    // components (40) against components:shadcn (51) is nowhere near 5x, so
    // both survive — not every component library is shadcn.
    expect(shortlist()).toContain('components')
    expect(shortlist()).toContain('components:shadcn')
  })

  it('offers one spelling of a tag, the most-used one', async () => {
    await classify()

    expect(shortlist()).toContain('CSS')
    expect(shortlist()).not.toContain('css')
  })

  it('never offers like: tags or Untagged', async () => {
    await classify()

    expect(shortlist()).not.toContain('like:youtube')
    expect(shortlist()).not.toContain('Untagged')
  })

  it('lets Clef say that nothing fits', async () => {
    await classify()

    expect(clefCall().questions.tags.criteria).toHaveProperty('__none__')
  })

  it('applies every tag likely enough, most likely first', async () => {
    const result = await classify({ 'app:mac': 0.3, CLI: 0.6, CSS: 0.05 })

    expect(result.tags).toEqual([
      { isNew: false, name: 'CLI' },
      { isNew: false, name: 'app:mac' },
    ])
    expect(generatorCall()).toBeUndefined()
  })

  it('drops a collection when one of its tags is picked', async () => {
    const result = await classify({ app: 0.2, 'app:mac': 0.5, CLI: 0.2 })

    expect(result.tags).toEqual([
      { isNew: false, name: 'app:mac' },
      { isNew: false, name: 'CLI' },
    ])
  })

  it('caps the tags at five', async () => {
    const tags = Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [`popular-${index}`, 0.12]),
    )
    const result = await classify(tags)

    expect(result.tags).toHaveLength(5)
  })

  it('answers with the spelling already in the database', async () => {
    // "cli" saved as is would sit beside the user's "CLI".
    const result = await classify({ cli: 0.9 })

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
  })

  it('drops bookmark types and like: tags', async () => {
    const result = await classify({ CLI: 0.5, 'like:youtube': 0.2, video: 0.2 })

    expect(result.tags).toEqual([{ isNew: false, name: 'CLI' }])
  })

  it('takes the type from Clef', async () => {
    const result = await classify({ CLI: 0.9 }, 'article')

    expect(result.type).toBe('article')
  })

  it('keeps the current type when the model returns a bad one', async () => {
    const result = await classify({ CLI: 0.9 }, 'spaceship')

    expect(result.type).toBe('link')
  })

  describe('when nothing fits', () => {
    const aiTags = [
      { count: 30, tag: 'AI:Claude' },
      { count: 20, tag: 'AI:OpenAI' },
      { count: 10, tag: 'CSS' },
    ]

    const classifyNew = (clef: Clef, newTag: string) => {
      respond(clef, newTag)

      return classifyBookmark({
        context,
        currentType: 'link',
        description: 'Google DeepMind model family',
        existingTags: aiTags,
        title: 'Gemini',
        url: 'https://gemini.google.com/',
      })
    }

    it('writes a new tag when Clef picks none', async () => {
      const result = await classifyNew(
        { tags: { __none__: 0.95, 'AI:Claude': 0.03 } },
        'AI:Gemini',
      )

      expect(result.tags).toEqual([{ isNew: true, name: 'AI:Gemini' }])
    })

    it('writes a new tag when Clef picks none over a likely sibling', async () => {
      const result = await classifyNew(
        { tags: { __none__: 0.55, 'AI:Claude': 0.3, CSS: 0.15 } },
        'AI:Gemini',
      )

      expect(result.tags).toEqual([{ isNew: true, name: 'AI:Gemini' }])
    })

    it('writes a new tag when no tag is likely enough', async () => {
      const result = await classifyNew(
        { tags: { __none__: 0.05, 'AI:Claude': 0.06, CSS: 0.04 } },
        'AI:Gemini',
      )

      expect(result.tags).toEqual([{ isNew: true, name: 'AI:Gemini' }])
    })

    it('shows the generator the collections', async () => {
      await classifyNew({ tags: { __none__: 1 } }, 'AI:Gemini')

      const prompt = generatorCall().messages[0].content

      expect(prompt).toContain('AI: AI:Claude, AI:OpenAI')
    })

    it('spells the parent the way the user does', async () => {
      const result = await classifyNew({ tags: { __none__: 1 } }, 'ai : Gemini')

      expect(result.tags).toEqual([{ isNew: true, name: 'AI:Gemini' }])
    })

    it('reuses a tag the shortlist leaves out', async () => {
      // "AI" is kept off the shortlist by "AI:Claude", but it is still theirs.
      respond({ tags: { __none__: 1 } }, 'ai')

      const result = await classifyBookmark({
        context,
        currentType: 'link',
        description: '',
        existingTags: [...aiTags, { count: 2, tag: 'AI' }],
        title: 'Gemini',
        url: 'https://gemini.google.com/',
      })

      expect(result.tags).toEqual([{ isNew: false, name: 'AI' }])
    })

    it('falls back to the collection itself', async () => {
      const result = await classifyNew({ tags: { __none__: 1 } }, 'ai')

      expect(result.tags).toEqual([{ isNew: true, name: 'AI' }])
    })

    it('reuses an existing tag the generator repeats', async () => {
      const result = await classifyNew({ tags: { __none__: 1 } }, 'ai:claude')

      expect(result.tags).toEqual([{ isNew: false, name: 'AI:Claude' }])
    })

    it('writes a tag for a user with no tags yet', async () => {
      respond({}, 'gaming')

      const result = await classifyBookmark({
        context,
        currentType: 'link',
        description: '',
        existingTags: [],
        title: 'Steam',
        url: 'https://store.steampowered.com/',
      })

      expect(clefCall().questions.tags).toBeUndefined()
      expect(result.tags).toEqual([{ isNew: true, name: 'gaming' }])
    })

    it('returns no tags when the generator gives none', async () => {
      const result = await classifyNew({ tags: { __none__: 1 } }, '  ')

      expect(result.tags).toEqual([])
    })
  })
})
