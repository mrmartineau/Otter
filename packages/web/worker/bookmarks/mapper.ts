import type { bookmarks } from '../../db/schema'
import type { BaseBookmark } from '../../src/types/db'

export type BookmarkRow = typeof bookmarks.$inferSelect

export const bookmarkToRow = (bookmark: BookmarkRow): BaseBookmark => ({
  bluesky_post_uri: bookmark.blueskyPostUri,
  click_count: bookmark.clickCount,
  created_at: bookmark.createdAt.toISOString(),
  description: bookmark.description,
  feed: bookmark.feed,
  id: bookmark.id,
  image: bookmark.image,
  modified_at: bookmark.modifiedAt.toISOString(),
  note: bookmark.note,
  public: bookmark.public,
  star: bookmark.star,
  status: bookmark.status,
  tags: bookmark.tags,
  title: bookmark.title,
  tweet: bookmark.tweet as BaseBookmark['tweet'],
  type: bookmark.type,
  url: bookmark.url,
  user: bookmark.user,
})
