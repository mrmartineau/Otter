import type { SupabaseClient } from '@supabase/supabase-js'
import { queryOptions } from '@tanstack/react-query'
import type { Database } from '../../types/supabase'
import { supabase } from '../supabase/client'

export interface DbMetaResponse {
  all: number
  top: number
  public: number
  stars: number
  trash: number
  types: MetaType[]
  tags: MetaTag[]
  toots: number
  likedToots: number
  tweets: number
  likedTweets: number
  collections?: CollectionType[]
}
export type MetaTag = Database['public']['Views']['tags_count']['Row']
export type MetaType = Database['public']['Views']['types_count']['Row']

export type CollectionType =
  Database['public']['Views']['collection_tags_view']['Row']

export const getDbMetadata = async (
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<DbMetaResponse> => {
  const [
    bookmarks,
    types,
    tags,
    collections,
    toots,
    likedToots,
    tweets,
    likedTweets,
  ] = await Promise.all([
    supabaseClient.from('bookmark_counts').select('*').single(),
    supabaseClient.from('types_count').select('*'),
    supabaseClient.from('tags_count').select('*'),
    supabaseClient.from('collection_tags_view').select('*'),
    supabaseClient
      .from('toots')
      .select('id', { count: 'exact' })
      .match({ liked_toot: false }),
    supabaseClient
      .from('toots')
      .select('id', { count: 'exact' })
      .match({ liked_toot: true }),
    supabaseClient
      .from('tweets')
      .select('id', { count: 'exact' })
      .match({ liked_tweet: false }),
    supabaseClient
      .from('tweets')
      .select('id', { count: 'exact' })
      .match({ liked_tweet: true }),
  ])

  const { all_count, top_count, trash_count, stars_count, public_count } =
    bookmarks?.data || {}

  return {
    all: all_count || 0,
    collections: collections.data || [],
    likedToots: likedToots.count || 0,
    likedTweets: likedTweets.count || 0,
    public: public_count || 0,
    stars: stars_count || 0,
    tags: tags.data || [],
    toots: toots.count || 0,
    top: top_count || 0,
    trash: trash_count || 0,
    tweets: tweets.count || 0,
    types: types.data || [],
  }
}

export const getMetaOptions = () => {
  return queryOptions({
    queryFn: () => getDbMetadata(),
    queryKey: ['meta'],
    staleTime: 5 * 1000,
  })
}
