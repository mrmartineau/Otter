import matchWords from 'match-words'
import memoizeOne from 'memoize-one'

import type { MetadataResponse } from '../types/api'
import type { MetaTag } from './fetching/meta'

export interface MatchTagsProps extends Partial<MetadataResponse> {
  note?: string
}

/**
 * Every word in the text, lowercased, with a naive singular alongside each
 * plural so "APIs" still reaches the "api" tag.
 */
const wordSet = (text: string) => {
  const words = new Set<string>()

  for (const word of matchWords(text) ?? []) {
    const lower = word.toLowerCase()
    words.add(lower)

    if (lower.endsWith('s')) {
      words.add(lower.slice(0, -1))
    }
  }

  return words
}

/**
 * The tags a page's text actually mentions.
 *
 * Every part of a tag has to appear as a whole word. Both halves of that rule
 * matter: matching substrings let "inside" pull in "IDE" and "source" pull in
 * "rc", and matching a single part of "app:mac" let the word "app" pull in
 * every `app:*` tag at once.
 */
export const matchTagNames = (text: string, tagNames: string[]) => {
  if (!text.trim()) {
    return []
  }

  const words = wordSet(text)

  return tagNames.filter((name) => {
    const parts = name
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter(Boolean)

    return parts.length > 0 && parts.every((part) => words.has(part))
  })
}

export const matchTagsSource = (data: MatchTagsProps, tags?: MetaTag[]) => {
  const text = [data?.title, data?.description, data?.note]
    .filter(Boolean)
    .join(' ')
  const tagNames = tags?.map((item) => item.tag).filter(Boolean) as string[]

  if (!text || !tagNames?.length) {
    return []
  }

  return matchTagNames(text, tagNames)
}

export const matchTags = memoizeOne(matchTagsSource)
