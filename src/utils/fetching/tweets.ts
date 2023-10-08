import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParameters, apiParameters } from './apiParameters';

interface TweetFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<Pick<ApiParameters, 'limit' | 'offset' | 'order'>>;
  likes: boolean;
}
export const getTweets = async ({
  supabaseClient,
  params,
  likes,
}: TweetFetchingOptions) => {
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
