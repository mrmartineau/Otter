import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParametersQuery, apiParameters } from './apiParameters';

interface TweetsFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>;
  likes: boolean;
}
export const getTweets = async ({
  supabaseClient,
  params,
  likes,
}: TweetsFetchingOptions) => {
  const { limit, offset, order } = apiParameters(params);

  const supabaseResponse = await supabaseClient
    .from('tweets')
    .select('*', { count: 'exact' })
    .match({ liked_tweet: likes })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (supabaseResponse.error) {
    throw supabaseResponse.error;
  }

  return supabaseResponse;
};

interface TweetFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  id: string;
}
export const getTweet = async ({
  supabaseClient,
  id,
}: TweetFetchingOptions) => {
  const supabaseResponse = await supabaseClient
    .from('tweets')
    .select('*')
    .match({ id })
    .single();

  return supabaseResponse;
};
