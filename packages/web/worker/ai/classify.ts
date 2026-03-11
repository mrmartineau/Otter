import type { Context } from 'hono'
import { AI_MODEL } from './consts';

export type AiClassifyResponse = {
  tags: { name: string; isNew: boolean }[]
  type: string
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
] as const

const classifySystemPrompt = (
  existingTags: string[],
  currentType: string,
) => `You are a bookmark classifier. Given a URL, title, and description for a web page, you must:

1. Select the most relevant tags, between 1 and 5. Only include tags that are a strong match — not every bookmark needs 5 tags.
2. Determine whether the content type should stay as "${currentType}" or change to another type from this fixed list: ${BOOKMARK_TYPES.join(', ')}.

IMPORTANT — Tag selection process:
- You MUST first search the existing tags list exhaustively before considering any new tag. Reusing an existing tag is strongly preferred.
- Treat close lexical variants as matches: plural/singular, derivations, morphology, and nearby forms (e.g. "orchestration", "orchestrate", and "orchestrators" should map to existing "ai:orchestrator" when relevant).
- Many tags use prefixes with colons (e.g. "ai:orchestrator", "dev:tools", "css:animation"). Check ALL existing tags including prefixed tags and compare by meaning, not exact surface form.
- If an existing tag is even reasonably relevant, choose it instead of inventing a new one.
- Only invent a new tag as a last resort when no existing tag is semantically appropriate. New tags should be lowercase, concise (1-2 words), and use kebab-case for multi-word tags.

Existing tags:
${existingTags.join(', ')}

Respond ONLY with valid JSON in this exact format, no other text:
{"tags": [{"name": "tag-name", "isNew": false}], "type": "link"}

Rules:
- Maximum 5 tags
- "isNew" must be false for tags from the existing list, true for invented tags
- Prefer existing tags over new tags in all borderline cases
- Normalize mentally before matching (singular/plural, tense, and word family) and pick the closest existing tag
- The "type" must be one of: ${BOOKMARK_TYPES.join(', ')}
- Start from the current type "${currentType}" as the default assumption
- Only change the type if there is strong evidence from the URL/title/description that "${currentType}" is wrong
- If unsure, keep the current type "${currentType}"
- Consider the URL domain and path structure as hints for type (e.g. youtube.com = video, medium.com = article)
- GitHub repository URLs (e.g. github.com/owner/repo) are always type "link", not "document" or "article"
- NEVER suggest tags starting with "like:" — those are reserved for external service favorites`

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
  existingTags: string[]
  currentType: string
}): Promise<AiClassifyResponse> => {
  const prompt = `URL: ${url}\nTitle: ${title}\nDescription: ${description}`
  const normalizedCurrentType = BOOKMARK_TYPES.includes(
    currentType as (typeof BOOKMARK_TYPES)[number],
  )
    ? currentType
    : 'link'

  const response = (await context.env.AI.run(AI_MODEL, {
    prompt: `${classifySystemPrompt(existingTags, normalizedCurrentType)}\n\n${prompt}`,
  })) as { response: string }

  try {
    const text = response.response.trim()
    // Extract JSON from the response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const parsed = JSON.parse(jsonMatch[0])

    // Validate and sanitize
    const existingTagSet = new Set(existingTags.map((t) => t.toLowerCase()))
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .slice(0, 5)
          .filter(
            (t: unknown) =>
              t &&
              typeof t === 'object' &&
              'name' in (t as Record<string, unknown>) &&
              typeof (t as Record<string, string>).name === 'string' &&
              !(t as Record<string, string>).name.startsWith('like:'),
          )
          .map((t: { name: string }) => ({
            isNew: !existingTagSet.has(t.name.toLowerCase()),
            name: t.name,
          }))
      : []

    const type = BOOKMARK_TYPES.includes(parsed.type)
      ? parsed.type
      : normalizedCurrentType

    return { tags, type }
  } catch {
    return { tags: [], type: normalizedCurrentType }
  }
}
