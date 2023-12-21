import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParametersQuery, apiParameters } from './apiParameters';

interface TootsFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>;
  likes: boolean;
}
export const getToots = async ({
  supabaseClient,
  params,
  likes,
}: TootsFetchingOptions) => {
  const { limit, offset, order } = apiParameters(params);

  const supabaseResponse = await supabaseClient
    .from('toots')
    .select('*', { count: 'exact' })
    .match({ liked_toot: likes })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (supabaseResponse.error) {
    throw supabaseResponse.error;
  }

  return supabaseResponse;
};

interface TootFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  id: string;
}
export const getToot = async ({ supabaseClient, id }: TootFetchingOptions) => {
  const supabaseResponse = await supabaseClient
    .from('toots')
    .select('*')
    .match({ id })
    .single();

  return supabaseResponse;
};
