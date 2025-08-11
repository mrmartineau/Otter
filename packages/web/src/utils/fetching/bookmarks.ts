import type { SupabaseClient } from '@supabase/supabase-js'
import { queryOptions } from '@tanstack/react-query'
import type { Database } from '@/types/supabase'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

export const getBookmarks = async (
  params: Partial<ApiParametersQuery> = {},
  supabaseClient: SupabaseClient<Database> = supabase,
  userId?: string
) => {
  const {
    limit,
    offset,
    order,
    status,
    type,
    star,
    tag,
    top,
    public: publicItems,
  } = apiParameters(params)

  let query = supabaseClient.from('bookmarks').select('*', { count: 'exact' })

  if (userId) {
    query = query.eq('user', userId)
  }
  if (status) {
    query = query.match({ status })
  }
  if (star) {
    query = query.match({ star })
  }
  if (publicItems) {
    query = query.match({ public: publicItems })
  }
  if (type) {
    query = query.match({ type })
  }
  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', ['{}'])
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`)
    }
  }
  if (top) {
    query = query
      .order('click_count', { ascending: false })
      .gte('click_count', 1)
  }

  const supabaseResponse = await query
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getBookmarksOptions = (params: Partial<ApiParametersQuery>) => {
  return queryOptions({
    queryFn: () => getBookmarks(params),
    queryKey: ['bookmarks', params],
    staleTime: 5 * 1000,
  })
}

interface BookmarkFetchingOptions {
  id: string
}
export const getBookmark = async ({ id }: BookmarkFetchingOptions) => {
  const supabaseResponse = await supabase
    .from('bookmarks')
    .select('*')
    .match({ id })
    .single()

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getBookmarkOptions = ({ id }: BookmarkFetchingOptions) => {
  return queryOptions({
    queryFn: () => getBookmark({ id }),
    queryKey: ['bookmark', id],
    staleTime: 5 * 1000,
  })
}
