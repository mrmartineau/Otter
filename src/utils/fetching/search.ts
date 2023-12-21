import { Database } from '@/src/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

import { ApiParametersQuery, apiParameters } from './apiParameters';

interface SearchFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
  params: Partial<ApiParametersQuery>;
  searchTerm: string;
}
export const getSearchBookmarks = async ({
  supabaseClient,
  searchTerm,
  params,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params);

  // Search bookmarks
  let bookmarksSearchQuery = supabaseClient
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    );

  if (status) {
    bookmarksSearchQuery = bookmarksSearchQuery.match({ status });
  }
  if (type) {
    bookmarksSearchQuery = bookmarksSearchQuery.match({ type });
  }
  const bookmarksSearch = await bookmarksSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  return bookmarksSearch;
};

export const getSearchTweets = async ({
  supabaseClient,
  searchTerm,
  params,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params);

  // Search tweets
  let tweetsSearchQuery = supabaseClient
    .from('tweets')
    .select('*', { count: 'exact' })
    .or(`text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*`);

  if (status) {
    tweetsSearchQuery = tweetsSearchQuery.match({ status });
  }
  if (type) {
    tweetsSearchQuery = tweetsSearchQuery.match({ type });
  }
  const tweetsSearch = await tweetsSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  return tweetsSearch;
};

export const getSearchToots = async ({
  supabaseClient,
  searchTerm,
  params,
}: SearchFetchingOptions) => {
  const { limit, offset, order, status, type } = apiParameters(params);

  // Search Mastodon toots
  let tweetsSearchQuery = supabaseClient
    .from('toots')
    .select('*', { count: 'exact' })
    .or(`text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*`);

  if (status) {
    tweetsSearchQuery = tweetsSearchQuery.match({ status });
  }
  if (type) {
    tweetsSearchQuery = tweetsSearchQuery.match({ type });
  }
  const tweetsSearch = await tweetsSearchQuery
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  return tweetsSearch;
};
