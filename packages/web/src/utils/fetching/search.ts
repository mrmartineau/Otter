import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

interface SearchFetchingOptions {
  params: Partial<ApiParametersQuery>
  searchTerm: string
  supabaseClient?: SupabaseClient<Database>
  userId?: string
}
export const getSearchBookmarks = async ({
  searchTerm,
  params,
  supabaseClient = supabase,
  userId,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params)

  // Search bookmarks
  let bookmarksSearchQuery = supabaseClient
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`
    )

  if (userId) {
    bookmarksSearchQuery = bookmarksSearchQuery.eq('user', userId)
  }
  if (status) {
    bookmarksSearchQuery = bookmarksSearchQuery.match({ status })
  }
  if (type) {
    bookmarksSearchQuery = bookmarksSearchQuery.match({ type })
  }
  const bookmarksSearch = await bookmarksSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  return bookmarksSearch
}

export const getSearchTweets = async ({
  searchTerm,
  params,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params)

  // Search tweets
  let tweetsSearchQuery = supabase
    .from('tweets')
    .select('*', { count: 'exact' })
    .or(`text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*`)

  if (status) {
    tweetsSearchQuery = tweetsSearchQuery.match({ status })
  }
  if (type) {
    tweetsSearchQuery = tweetsSearchQuery.match({ type })
  }
  const tweetsSearch = await tweetsSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  return tweetsSearch
}

export const getSearchToots = async ({
  searchTerm,
  params,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params)

  // Search Mastodon toots
  let tweetsSearchQuery = supabase
    .from('toots')
    .select('*', { count: 'exact' })
    .or(`text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*`)

  if (status) {
    tweetsSearchQuery = tweetsSearchQuery.match({ status })
  }
  if (type) {
    tweetsSearchQuery = tweetsSearchQuery.match({ type })
  }
  const tweetsSearch = await tweetsSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  return tweetsSearch
}
