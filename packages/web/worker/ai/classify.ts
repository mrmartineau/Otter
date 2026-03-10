import type { Context } from 'hono'

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
) => `You are a bookmark classifier. Given a URL, title, and description for a web page, you must:

1. Select the most relevant tags, between 1 and 5. Only include tags that are a strong match — not every bookmark needs 5 tags.
2. Determine the content type from this fixed list: ${BOOKMARK_TYPES.join(', ')}.

IMPORTANT — Tag selection process:
- You MUST first search the existing tags list thoroughly before considering new tags. Many tags use prefixes with colons (e.g. "ai:orchestrator", "dev:tools", "css:animation"). Check ALL existing tags including those with prefixes — a partial word match in the existing list (e.g. "ai:orchestrator" for an orchestration tool) is ALWAYS better than inventing a new tag like "orchestrator".
- Only invent a new tag if absolutely no existing tag is relevant. New tags should be lowercase, concise (1-2 words), and use kebab-case for multi-word tags.

Existing tags:
${existingTags.join(', ')}

Respond ONLY with valid JSON in this exact format, no other text:
{"tags": [{"name": "tag-name", "isNew": false}], "type": "link"}

Rules:
- Maximum 5 tags
- "isNew" must be false for tags from the existing list, true for invented tags
- The "type" must be one of: ${BOOKMARK_TYPES.join(', ')}
- If unsure about type, use "link" as the default
- Consider the URL domain and path structure as hints for type (e.g. youtube.com = video, medium.com = article)
- GitHub repository URLs (e.g. github.com/owner/repo) are always type "link", not "document" or "article"
- NEVER suggest tags starting with "like:" — those are reserved for external service favorites`

export const classifyBookmark = async ({
  context,
  title,
  description,
  url,
  existingTags,
}: {
  context: Context
  title: string
  description: string
  url: string
  existingTags: string[]
}): Promise<AiClassifyResponse> => {
  const prompt = `URL: ${url}\nTitle: ${title}\nDescription: ${description}`

  const response = (await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt: `${classifySystemPrompt(existingTags)}\n\n${prompt}`,
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
    const existingTagSet = new Set(
      existingTags.map((t) => t.toLowerCase()),
    )
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
            name: t.name,
            isNew: !existingTagSet.has(t.name.toLowerCase()),
          }))
      : []

    const type = BOOKMARK_TYPES.includes(parsed.type) ? parsed.type : 'link'

    return { tags, type }
  } catch {
    return { tags: [], type: 'link' }
  }
}
