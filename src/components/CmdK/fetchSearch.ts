'use client';

import { createBrowserClient } from '@/src/utils/supabase/client';

export const fetchSearch = async (searchTerm: string) => {
  const supabaseClient = createBrowserClient();
  const bookmarksSearch = await supabaseClient
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })
    .limit(5);
  const tweetsSearch = await supabaseClient
    .from('tweets')
    .select('*', { count: 'exact' })
    .or(
      `text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*,hashtags.cs.{${searchTerm}}`,
    )
    .order('created_at', { ascending: false })
    .limit(5);
  const tootsSearch = await supabaseClient
    .from('toots')
    .select('*', { count: 'exact' })
    .or(
      `text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*,user_id.ilike.*${searchTerm}*,hashtags.cs.{${searchTerm}}`,
    )
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    bookmarksSearch,
    tweetsSearch,
    tootsSearch,
  };
};
