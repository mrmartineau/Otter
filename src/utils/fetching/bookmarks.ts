import { type Database } from '@/src/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type ApiParametersQuery, apiParameters } from './apiParameters';

interface BookmarksFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<ApiParametersQuery>;
}
export const getBookmarks = async ({
  supabaseClient,
  params,
}: BookmarksFetchingOptions) => {
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
  } = apiParameters(params);
  let query = supabaseClient.from('bookmarks').select('*', { count: 'exact' });

  if (status) {
    query = query.match({ status });
  }
  if (star) {
    query = query.match({ star });
  }
  if (publicItems) {
    query = query.match({ public: publicItems });
  }
  if (type) {
    query = query.match({ type });
  }
  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', '{}');
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`);
    }
  }
  if (top) {
    query = query
      .order('click_count', { ascending: false })
      .gte('click_count', 1);
  }

  const supabaseResponse = await query
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (supabaseResponse.error) {
    throw supabaseResponse.error;
  }

  return supabaseResponse;
};

interface BookmarkFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  id: string;
}
export const getBookmark = async ({
  supabaseClient,
  id,
}: BookmarkFetchingOptions) => {
  const supabaseResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .match({ id })
    .single();

  return supabaseResponse;
};
