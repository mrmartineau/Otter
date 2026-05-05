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

export interface Bookmark {
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
  tweet?: {
    text: string
    username: string
    url: string
  } | null
  type: BookmarkType | null
  url: string | null
  user: string | null
}

export interface MetaResponse {
  types: MetaType[]
  tags: MetaTag[]
  collections?: CollectionType[]
}

export interface MetaTag {
  count: number | null
  tag: string | null
}

export interface MetaType {
  count: number | null
  type: BookmarkType | null
}

export interface CollectionType {
  bookmark_count: number | null
  collection: string | null
  tags: string[] | null
}
