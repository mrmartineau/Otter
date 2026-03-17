import { infiniteQueryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

interface TweetsFetchingOptions {
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
  likes: boolean
}
export const getTweets = async ({ params, likes }: TweetsFetchingOptions) => {
  const { limit, offset, order } = apiParameters(params)

  const supabaseResponse = await supabase
    .from('tweets')
    .select('*', { count: 'exact' })
    .match({ liked_tweet: likes })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getTweetsInfiniteOptions = ({
  params,
  likes,
}: TweetsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    queryFn: ({ pageParam = 0 }) =>
      getTweets({ likes, params: { ...rest, limit, offset: pageParam } }),
    queryKey: ['tweets', 'infinite', likes, rest, limit],
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit!
      return nextOffset < total ? nextOffset : undefined
    },
  })
}

interface TweetFetchingOptions {
  id: string
}
export const getTweet = async ({ id }: TweetFetchingOptions) => {
  const supabaseResponse = await supabase
    .from('tweets')
    .select('*')
    .match({ id })
    .single()

  return supabaseResponse
}
