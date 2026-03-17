import type { SupabaseClient } from '@supabase/supabase-js'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
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
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
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

export const getSearchBookmarksOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchBookmarks({ params, searchTerm }),
    queryKey: ['bookmarks', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
}

export const getSearchBookmarksInfiniteOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getSearchBookmarks>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit!
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getSearchBookmarks({
        params: { ...rest, limit, offset: pageParam },
        searchTerm,
      }),
    queryKey: ['bookmarks', 'search', 'infinite', rest, limit, searchTerm],
    staleTime: 5 * 1000,
  })
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

export const getSearchTweetsOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchTweets({ params, searchTerm }),
    queryKey: ['tweets', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
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

export const getSearchTootsOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchToots({ params, searchTerm }),
    queryKey: ['toots', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
}
