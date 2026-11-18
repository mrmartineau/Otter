/**
 * Rewriting titles, descriptions and summaries: cheap, and the output is prose
 * rather than a choice from a list.
 *
 * The old `@cf/meta/llama-3.1-8b-instruct-fast` is no longer in the Workers AI
 * catalogue and has no JSON mode.
 */
export const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'

/**
 * Tagging and typing a bookmark. A decision model: it scores the options it is
 * given rather than writing text, so it can only answer with an existing tag.
 */
export const AI_DECISION_MODEL = '@cf/cloudflare/clef-flash'

/**
 * Writing a new tag when none of the existing ones fit. Short output, but it
 * has to follow the user's naming style and a schema, which the 8b models are
 * bad at.
 */
export const AI_CLASSIFY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
