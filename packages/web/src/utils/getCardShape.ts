import type { Bookmark, BookmarkType } from '@/types/db'

export type CardShape =
  | 'article'
  | 'audio'
  | 'note'
  | 'object'
  | 'picture'
  | 'video'

// Things you'd recognise by their picture, so the card leads with a square image
const OBJECT_TYPES: BookmarkType[] = [
  'book',
  'event',
  'game',
  'place',
  'product',
  'recipe',
]

/** Picks the card layout for a bookmark in the cards view. */
export const getCardShape = ({
  type,
  url,
  note,
}: Pick<Bookmark, 'type' | 'url' | 'note'>): CardShape => {
  if (type === 'video') return 'video'
  if (type === 'image') return 'picture'
  if (type === 'audio') return 'audio'
  if (type === 'note' || (!url && note)) return 'note'
  if (type && OBJECT_TYPES.includes(type)) return 'object'
  return 'article'
}
