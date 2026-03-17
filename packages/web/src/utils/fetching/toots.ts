import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

interface TootsFetchingOptions {
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
  likes: boolean
}
export const getToots = async ({
  params,
  likes = false,
}: TootsFetchingOptions) => {
  const { limit, offset, order } = apiParameters(params)

  const supabaseResponse = await supabase
    .from('toots')
    .select('*', { count: 'exact' })
    .match({ liked_toot: likes })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getTootsOptions = ({ params, likes }: TootsFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToots({ likes, params }),
    queryKey: ['toots', likes, params],
  })
}

export const getTootsInfiniteOptions = ({
  params,
  likes,
}: TootsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    queryFn: ({ pageParam = 0 }) =>
      getToots({ likes, params: { ...rest, limit, offset: pageParam } }),
    queryKey: ['toots', 'infinite', likes, rest, limit],
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit!
      return nextOffset < total ? nextOffset : undefined
    },
  })
}

interface TootFetchingOptions {
  id: string
}
export const getToot = async ({ id }: TootFetchingOptions) => {
  const supabaseResponse = await supabase
    .from('toots')
    .select('*')
    .match({ id })
    .single()

  return supabaseResponse
}

export const getTootOptions = ({ id }: TootFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToot({ id }),
    queryKey: ['toots', id],
  })
}
