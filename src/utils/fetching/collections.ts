import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParametersQuery, apiParameters } from './apiParameters';

interface CollectionsFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<ApiParametersQuery>;
  name: string;
}
export const getCollections = async ({
  supabaseClient,
  params,
  name,
}: CollectionsFetchingOptions) => {
  const {
    limit,
    offset,
    star,
    type,
    status,
    public: publicItems,
  } = apiParameters(params);
  let query = supabaseClient
    .rpc(
      'get_bookmarks_by_collection',
      {
        collection_name: name,
      },
      { count: 'exact' },
    )
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.match({ status });
  }
  if (star) {
    query = query.match({ star });
  }
  if (type) {
    query = query.match({ type });
  }
  if (publicItems) {
    query = query.match({ public: publicItems });
  }

  const supabaseResponse = await query;

  if (supabaseResponse.error) {
    throw supabaseResponse.error;
  }

  return supabaseResponse;
};
