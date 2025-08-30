import type { Database } from './supabase'

export type BaseBookmark = Database['public']['Tables']['bookmarks']['Row']
export type Bookmark = Omit<BaseBookmark, 'tweet'> & {
  tweet?: {
    text: string
    username: string
    url: string
  }
}
export type BookmarkType = Database['public']['Enums']['type']
export type BookmarkStatus = Database['public']['Enums']['status']
export type Tweet = Database['public']['Tables']['tweets']['Row']
export type Toot = Database['public']['Tables']['toots']['Row']
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

export type UserProfile = Database['public']['Tables']['profiles']['Row']

export type Collection =
  Database['public']['Views']['collection_tags_view']['Row']

export type Media = Database['public']['Tables']['media']['Row']
export type MediaInsert = Database['public']['Tables']['media']['Insert']
export type MediaUpdate = Database['public']['Tables']['media']['Update']
export type MediaType = Database['public']['Enums']['media_type']
export type MediaStatus = Database['public']['Enums']['media_status']

export interface MediaFilters {
  search?: string
  type?: MediaType
  status?: Database['public']['Enums']['media_status']
}
