import { Database } from './supabase';

export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type BookmarkType = Database['public']['Enums']['type'];
export type BookmarkStatus = Database['public']['Enums']['status'];
export type Tweet = Database['public']['Tables']['tweets']['Row'];

export interface BookmarkFormValues
  extends Omit<
    Bookmark,
    | 'id'
    | 'created_at'
    | 'modified_at'
    | 'collection'
    | 'click_count'
    | 'excerpt'
    | 'feed'
  > {
  id?: string
}