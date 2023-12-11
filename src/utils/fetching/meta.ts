import { Database } from '@/src/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DbMetaResponse {
  all: number;
  top: number;
  public: number;
  stars: number;
  trash: number;
  types: MetaType[];
  tags: MetaTag[];
  toots: number;
  likedToots: number;
  tweets: number;
  likedTweets: number;
}
export type MetaTag = {
  count: number | null;
  tag: string | null;
};
export type MetaType = {
  count: number | null;
  type: Database['public']['Enums']['type'] | null;
};

export const getDbMetadata = async (
  supabaseClient: SupabaseClient<Database>,
): Promise<DbMetaResponse> => {
  const all = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ status: 'active' });
  const top = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ status: 'active' })
    .gte('click_count', 1);
  const trash = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ status: 'inactive' });
  const stars = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ star: true, status: 'active' });
  const publicBookmarks = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ public: true, status: 'active' });
  const types = await supabaseClient.from('types_count').select('*');
  const tags = await supabaseClient.from('tags_count').select('*');
  const toots = await supabaseClient
    .from('toots')
    .select('id', { count: 'exact' })
    .match({ liked_toot: false });
  const likedToots = await supabaseClient
    .from('toots')
    .select('id', { count: 'exact' })
    .match({ liked_toot: true });
  const tweets = await supabaseClient
    .from('tweets')
    .select('id', { count: 'exact' })
    .match({ liked_tweet: false });
  const likedTweets = await supabaseClient
    .from('tweets')
    .select('id', { count: 'exact' })
    .match({ liked_tweet: true });

  return {
    all: all.count || 0,
    top: top.count || 0,
    trash: trash.count || 0,
    public: publicBookmarks.count || 0,
    stars: stars.count || 0,
    types: types.data || [],
    tags: tags.data || [],
    toots: toots.count || 0,
    likedToots: likedToots.count || 0,
    tweets: tweets.count || 0,
    likedTweets: likedTweets.count || 0,
  };
};
