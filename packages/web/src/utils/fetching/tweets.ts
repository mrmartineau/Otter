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
