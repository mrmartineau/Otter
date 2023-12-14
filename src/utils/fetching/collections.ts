import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParameters, apiParameters } from './apiParameters';

interface CollectionsFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<ApiParameters>;
  name: string;
}
export const getCollections = async ({
  supabaseClient,
  params,
  name,
}: CollectionsFetchingOptions) => {
  const { limit, offset } = apiParameters(params);
  const supabaseResponse = await supabaseClient
    .rpc(
      'get_bookmarks_by_collection',
      {
        collection_name: name,
      },
      { count: 'exact' },
    )
    .range(offset, offset + limit - 1);

  if (supabaseResponse.error) {
    throw supabaseResponse.error;
  }

  return supabaseResponse;
};
