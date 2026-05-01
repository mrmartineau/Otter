type Json = unknown

export type BookmarkType =
  | 'link'
  | 'video'
  | 'audio'
  | 'recipe'
  | 'image'
  | 'document'
  | 'article'
  | 'game'
  | 'book'
  | 'event'
  | 'product'
  | 'note'
  | 'file'
  | 'place'

export type BookmarkStatus = 'active' | 'inactive'

export interface BaseBookmark {
  bluesky_post_uri: string | null
  click_count: number
  created_at: string
  description: string | null
  feed: string | null
  id: string
  image: string | null
  modified_at: string
  note: string | null
  public: boolean
  star: boolean
  status: BookmarkStatus
  tags: string[] | null
  title: string | null
  tweet: Json | null
  type: BookmarkType | null
  url: string | null
  user: string | null
}

export type Bookmark = Omit<BaseBookmark, 'tweet'> & {
  tweet?: {
    text: string
    username: string
    url: string
  } | null
}

export interface Tweet {
  created_at: string | null
  db_user_id: string | null
  hashtags: string[] | null
  id: string
  liked_tweet: boolean
  media: Json | null
  reply: Json | null
  text: string | null
  tweet_id: string | null
  tweet_url: string | null
  urls: Json | null
  user_avatar: string | null
  user_id: string | null
  user_name: string | null
}

export interface Toot {
  created_at: string | null
  db_user_id: string | null
  hashtags: string[] | null
  id: string
  liked_toot: boolean
  media: Json | null
  reply: Json | null
  text: string | null
  toot_id: string | null
  toot_url: string | null
  urls: Json | null
  user_avatar: string | null
  user_id: string | null
  user_name: string | null
}

export type TweetUrls = {
  url: string
  expanded_url: string
  display_url: string
  indices: number[]
}[]

export type TootUrls = {
  type: string
  isLink: boolean
  href: string
  value: string
  end: number
  start: number
}[]

export interface BookmarkFormValues
  extends Omit<
    Bookmark,
    | 'id'
    | 'created_at'
    | 'modified_at'
    | 'collection'
    | 'click_count'
    | 'excerpt'
  > {
  id?: string
}

export interface UserProfile {
  api_key: string | null
  avatar_url: string | null
  id: string
  settings_collections_visible: boolean
  settings_group_by_date: boolean | null
  settings_pinned_tags: string[]
  settings_tags_visible: boolean
  settings_top_tags_count: number | null
  settings_types_visible: boolean
  updated_at: string | null
  username: string | null
}

export interface UserIntegration {
  bluesky_app_password?: string | null
  bluesky_enabled: boolean
  bluesky_handle: string | null
  bluesky_last_error: string | null
  bluesky_post_prefix: string | null
  bluesky_post_suffix: string | null
  created_at: string
  updated_at: string | null
  user_id: string
}

export interface Collection {
  bookmark_count: number | null
  collection: string | null
  tags: string[] | null
}

export type MediaType =
  | 'tv'
  | 'film'
  | 'game'
  | 'book'
  | 'podcast'
  | 'music'
  | 'other'

export type MediaStatus = 'now' | 'skipped' | 'done' | 'wishlist'
export type MediaRating =
  | '0'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '4.5'
  | '5'

export interface Media {
  created_at: string
  id: number
  image: string | null
  media_id: string | null
  modified_at: string | null
  name: string
  platform: string | null
  rating: MediaRating | null
  sort_order: number | null
  status: MediaStatus | null
  type: MediaType | null
  user: string | null
}

export type MediaInsert = Omit<Media, 'created_at' | 'id' | 'modified_at'> & {
  created_at?: string
  id?: number
  modified_at?: string | null
}

export type MediaUpdate = Partial<MediaInsert>

export interface MediaFilters {
  search?: string
  type?: MediaType
  status?: MediaStatus
}
