import type { Context } from 'hono'
import type { BookmarkType } from '@/types/db'
import type { MetaTag } from '@/utils/fetching/meta'
import { matchTagNames } from '@/utils/matchTags'
import { AI_CLASSIFY_MODEL, AI_DECISION_MODEL } from './consts'

export type AiClassifyResponse = {
  tags: { name: string; isNew: boolean }[]
  type: BookmarkType
}

const BOOKMARK_TYPES = [
  'link',
  'video',
  'audio',
  'recipe',
  'image',
  'document',
  'article',
  'game',
  'book',
  'event',
  'product',
  'note',
  'file',
  'place',
] as const satisfies readonly BookmarkType[]

const BOOKMARK_TYPE_SET = new Set<string>(BOOKMARK_TYPES)

const isBookmarkType = (value: unknown): value is BookmarkType =>
  typeof value === 'string' && BOOKMARK_TYPE_SET.has(value)

const MAX_TAGS = 5

/** How many of the most-used tags ride along with the word matches. */
const POPULAR_TAG_COUNT = 40

/**
 * How many times more often the broader tag has to be used before it silences
 * the narrower one. Tuned against the real vocabulary: "app:mac" (349 uses)
 * silences "mac" (23) and "app" (21), while "components:shadcn" (51) leaves
 * "components" (40) alone, because those two really are different ideas.
 */
const MIN_DOMINANCE = 5

const tagParts = (name: string) =>
  new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter(Boolean),
  )

const isNarrowerThan = (a: Set<string>, b: Set<string>) =>
  a.size < b.size && [...a].every((part) => b.has(part))

/**
 * Collapses the near-duplicates a hand-grown vocabulary picks up, so the model
 * is never shown two names for one idea and cannot pick the rarer one.
 *
 * Two rules, both settled by use count:
 * - Same words however they are spelled or separated — "CSS" and "css",
 *   "app:mac" and "mac:app".
 * - A tag whose words are a subset of a far more used tag — "mac" and "app"
 *   standing next to "app:mac".
 *
 * `like:` tags mirror favourites on other services, so they are never ours to
 * suggest.
 */
const usableTags = (tags: MetaTag[]) => {
  const ranked = tags
    .filter(
      (item) =>
        item.tag && item.tag !== 'Untagged' && !item.tag.startsWith('like:'),
    )
    .map((item) => ({
      count: item.count ?? 0,
      name: item.tag as string,
      parts: tagParts(item.tag as string),
    }))
    .sort((a, b) => b.count - a.count)

  // Most-used first, so the first spelling of each idea is the one that stays.
  const bySignature = new Map<string, (typeof ranked)[number]>()

  for (const tag of ranked) {
    const signature = [...tag.parts].sort().join(' ')

    if (!bySignature.has(signature)) {
      bySignature.set(signature, tag)
    }
  }

  const unique = [...bySignature.values()]

  return unique
    .filter(
      (tag) =>
        !unique.some(
          (other) =>
            other !== tag &&
            other.count >= MIN_DOMINANCE * Math.max(tag.count, 1) &&
            isNarrowerThan(tag.parts, other.parts),
        ),
    )
    .map((tag) => tag.name)
}

/**
 * Collection tags the text names by their child alone: "Show an agent the
 * problem" never says "AI", but it is an "AI:Agent" page. Only the child
 * counts, so the word "AI" does not pull in every "AI:*" tag at once.
 */
const matchChildren = (tagNames: string[], text: string) => {
  const inCollections = tagNames.filter((name) => name.indexOf(':') > 0)
  const children = inCollections.map((name) =>
    name.slice(name.lastIndexOf(':') + 1),
  )
  const matched = new Set(matchTagNames(text, children))

  return inCollections.filter((_, index) => matched.has(children[index]))
}

/**
 * The model sees a shortlist, not the whole vocabulary. Handing it ~950 tag
 * names made it answer with popular unrelated ones — a mountain bike wheel
 * video came back tagged "golf" and "gaming". With ~50 candidates it picks
 * from what is in front of it.
 */
const buildShortlist = (tagNames: string[], text: string) => [
  ...new Set([
    ...matchTagNames(text, tagNames),
    ...matchChildren(tagNames, text),
    ...tagNames.slice(0, POPULAR_TAG_COUNT),
  ]),
]

/** Clef's answer to a `choice` question: a probability for every option. */
type ClefChoice = { choice?: string; probabilities?: Record<string, number> }

/** Not a tag. Lets Clef say nothing on the shortlist fits. */
const NO_TAG = '__none__'

/**
 * How likely a tag has to be before it is applied. Clef spreads one
 * probability across the whole shortlist, so a second tag that fits sits
 * well below the first: Ghostty came back CLI 0.88, app:mac 0.11.
 */
const MIN_TAG_PROBABILITY = 0.1

const TYPE_CRITERIA: Record<BookmarkType, string> = {
  article: 'A blog post, essay or other written piece',
  audio: 'A podcast, song or other audio',
  book: 'A book',
  document: 'A PDF, paper, spec or other document',
  event: 'A conference, meetup or other event',
  file: 'A file to download',
  game: 'A video game or board game',
  image: 'An image or photo',
  link: 'A website, tool, app or repository',
  note: 'A note',
  place: 'A place: a restaurant, shop or location',
  product: 'Something for sale',
  recipe: 'A recipe',
  video: 'A video',
}

const askClef = async ({
  context,
  candidates,
  currentType,
  state,
}: {
  context: Context
  candidates: string[]
  currentType: BookmarkType
  state: string
}) => {
  const questions: Record<string, unknown> = {
    type: {
      criteria: TYPE_CRITERIA,
      instructions: `What kind of bookmark is this? "${currentType}" is only a guess from the shape of the URL.`,
      type: 'choice',
    },
  }

  if (candidates.length) {
    questions.tags = {
      criteria: {
        ...Object.fromEntries(candidates.map((tag) => [tag, tag])),
        [NO_TAG]: 'None of these tags fit the bookmark',
      },
      instructions:
        'Which tags fit this bookmark? A tag written "Parent:Child" belongs to the Parent collection.',
      type: 'choice',
    }
  }

  const output = (await context.env.AI.run(AI_DECISION_MODEL, {
    model: 'clef-flash',
    questions,
    state,
  })) as {
    answers?: { tags?: ClefChoice; type?: ClefChoice }
  }

  return output.answers ?? {}
}

/** Every tag likely enough to apply, most likely first. */
const pickTags = (answer: ClefChoice | undefined) =>
  Object.entries(answer?.probabilities ?? {})
    .filter(
      ([tag, probability]) =>
        tag !== NO_TAG && probability >= MIN_TAG_PROBABILITY,
    )
    .sort(([, a], [, b]) => b - a)
    .map(([tag]) => tag)

/**
 * Collections are the "Parent:Child" tags grouped by parent, so the generator
 * can see "AI" holds "AI:Claude" and "AI:OpenAI" and add "AI:Gemini" beside
 * them.
 */
const collections = (tagNames: string[]) => {
  const byParent = new Map<string, string[]>()

  for (const tag of tagNames) {
    const index = tag.indexOf(':')

    if (index > 0) {
      const parent = tag.slice(0, index)
      byParent.set(parent, [...(byParent.get(parent) ?? []), tag])
    }
  }

  return [...byParent.entries()]
    .slice(0, 30)
    .map(([parent, tags]) => `${parent}: ${tags.slice(0, 6).join(', ')}`)
}

const newTagSystemPrompt = (
  tagNames: string[],
) => `You name a new tag for a saved web page. None of the user's existing tags fit it.

The user groups tags into collections with a colon: "AI:Claude" is the Claude collection inside AI. Their collections, with some of the tags in each:
${collections(tagNames).join('\n') || '(none yet)'}

Some of their other tags:
${tagNames
  .filter((tag) => !tag.includes(':'))
  .slice(0, 30)
  .join(', ')}

Rules:
- If the page belongs in one of those collections but no tag in it fits, add a new tag to that collection: "Parent:Child", spelling Parent exactly as the user does.
- If it belongs in a collection but is too general or one-off for a tag of its own, answer with the collection name alone, e.g. "AI".
- Otherwise make one short top-level tag.
- Match the user's casing and word separators.
- Answer with one tag. Never one the user already has, except a collection name alone.`

const generateTag = async ({
  context,
  tagNames,
  page,
}: {
  context: Context
  tagNames: string[]
  page: string
}) => {
  const { response } = (await context.env.AI.run(AI_CLASSIFY_MODEL, {
    messages: [
      { content: newTagSystemPrompt(tagNames), role: 'system' },
      { content: page, role: 'user' },
    ],
    response_format: {
      json_schema: {
        properties: { tag: { type: 'string' } },
        required: ['tag'],
        type: 'object',
      },
      type: 'json_schema',
    },
  })) as { response?: { tag?: string } }

  const tag =
    typeof response?.tag === 'string'
      ? response.tag.trim().replace(/\s*:\s*/g, ':')
      : ''

  if (!tag) {
    return undefined
  }

  // Spell the parent the way the user does: "ai:Gemini" joins "AI", and a
  // bare "ai" is the AI collection.
  const index = tag.indexOf(':')
  const head = index > 0 ? tag.slice(0, index) : tag
  const parent = tagNames
    .filter((name) => name.indexOf(':') > 0)
    .map((name) => name.slice(0, name.indexOf(':')))
    .find((name) => name.toLowerCase() === head.toLowerCase())

  return parent ? `${parent}${index > 0 ? tag.slice(index) : ''}` : tag
}

export const classifyBookmark = async ({
  context,
  title,
  description,
  url,
  existingTags,
  currentType,
}: {
  context: Context
  title: string
  description: string
  url: string
  existingTags: MetaTag[]
  currentType: string
}): Promise<AiClassifyResponse> => {
  const normalizedCurrentType = isBookmarkType(currentType)
    ? currentType
    : 'link'
  const tagNames = usableTags(existingTags)
  const candidates = buildShortlist(tagNames, `${title} ${description}`)
  const page = `URL: ${url}\nTitle: ${title}\nDescription: ${description}`

  const answers = await askClef({
    candidates,
    context,
    currentType: normalizedCurrentType,
    state: page,
  })

  // Clef can only choose from the shortlist, so when nothing on it fits the
  // other model writes a tag in the style of the user's vocabulary.
  let picked = pickTags(answers.tags)

  if (!picked.length) {
    const generated = await generateTag({ context, page, tagNames })
    picked = generated ? [generated] : []
  }

  // Match case-insensitively but answer with the spelling already in the
  // database, or picking "cli" when the user has "CLI" saves a second tag.
  // Where both spellings exist, the most-used one wins, which is the one
  // `existingTags` lists first.
  const canonical = new Map<string, string>()

  for (const tag of tagNames) {
    const key = tag.toLowerCase()

    if (!canonical.has(key)) {
      canonical.set(key, tag)
    }
  }
  const seen = new Set<string>()
  const tags: AiClassifyResponse['tags'] = []

  for (const name of picked) {
    const key = name.toLowerCase()

    if (
      seen.has(key) ||
      key === 'untagged' ||
      key.startsWith('like:') ||
      BOOKMARK_TYPE_SET.has(key)
    ) {
      continue
    }

    seen.add(key)
    tags.push({ isNew: !canonical.has(key), name: canonical.get(key) ?? name })
  }

  // "AI:Agent" already files the bookmark under AI, so "AI" on its own adds
  // nothing.
  const keys = tags.map((tag) => tag.name.toLowerCase())
  const leaves = tags.filter((tag) => {
    const prefix = `${tag.name.toLowerCase()}:`
    return !keys.some((key) => key.startsWith(prefix))
  })

  const type = isBookmarkType(answers.type?.choice)
    ? answers.type.choice
    : normalizedCurrentType

  return { tags: leaves.slice(0, MAX_TAGS), type }
}
