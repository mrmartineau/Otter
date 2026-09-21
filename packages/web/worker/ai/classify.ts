import type { Context } from 'hono'
import type { BookmarkType } from '@/types/db'
import type { MetaTag } from '@/utils/fetching/meta'
import { matchTagNames } from '@/utils/matchTags'
import { AI_CLASSIFY_MODEL } from './consts'

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
 * The model sees a shortlist, not the whole vocabulary. Handing it ~950 tag
 * names made it answer with popular unrelated ones — a mountain bike wheel
 * video came back tagged "golf" and "gaming". With ~50 candidates it picks
 * from what is in front of it.
 */
const buildShortlist = (tagNames: string[], text: string) => [
  ...new Set([
    ...matchTagNames(text, tagNames),
    ...tagNames.slice(0, POPULAR_TAG_COUNT),
  ]),
]

const classifySystemPrompt = (
  candidates: string[],
  currentType: string,
) => `You tag saved web pages. You are given a URL, a title and a description.

Pick between 1 and 5 tags from this list. Pick only tags that clearly fit the page — most pages need two or three:
${candidates.join(', ')}

If, and only if, no tag in the list fits, put one new tag in "newTags". Write it lowercase, one or two words, kebab-case for two words.

Also pick the content type. "${currentType}" is only a guess from the shape of the URL, so change it whenever the title or description says otherwise. A recipe page is "recipe", a thing for sale is "product", a blog post is "article", a repository is "link".

Rules:
- Never answer with a tag that is close to one in the list. Use the list one.
- Never use a content type as a tag.
- An empty "tags" is better than a tag that does not fit.`

/**
 * A JSON schema makes the shortlist the only spellings the model can answer
 * with, so it cannot invent a near-duplicate of a tag the user already has.
 */
const responseSchema = (candidates: string[]) => ({
  properties: {
    newTags: { items: { type: 'string' }, maxItems: 1, type: 'array' },
    tags: {
      items: candidates.length
        ? { enum: candidates, type: 'string' }
        : { type: 'string' },
      maxItems: MAX_TAGS,
      type: 'array',
    },
    type: { enum: [...BOOKMARK_TYPES], type: 'string' },
  },
  required: ['tags', 'type'],
  type: 'object',
})

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

  const messages = [
    {
      content: classifySystemPrompt(candidates, normalizedCurrentType),
      role: 'system',
    },
    {
      content: `URL: ${url}\nTitle: ${title}\nDescription: ${description}`,
      role: 'user',
    },
  ]

  const { response } = (await context.env.AI.run(AI_CLASSIFY_MODEL, {
    messages,
    response_format: {
      json_schema: responseSchema(candidates),
      type: 'json_schema',
    },
  })) as {
    response?: { tags?: string[]; newTags?: string[]; type?: string }
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

  for (const raw of [...(response?.tags ?? []), ...(response?.newTags ?? [])]) {
    const name = typeof raw === 'string' ? raw.trim() : ''
    const key = name.toLowerCase()

    if (
      !name ||
      seen.has(key) ||
      key.startsWith('like:') ||
      BOOKMARK_TYPE_SET.has(key)
    ) {
      continue
    }

    seen.add(key)
    tags.push({ isNew: !canonical.has(key), name: canonical.get(key) ?? name })

    if (tags.length === MAX_TAGS) {
      break
    }
  }

  const type = isBookmarkType(response?.type)
    ? response.type
    : normalizedCurrentType

  return { tags, type }
}
