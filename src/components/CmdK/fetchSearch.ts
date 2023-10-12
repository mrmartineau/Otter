import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const fetchSearch = async (searchTerm: string) => {
  const supabaseClient = createClientComponentClient();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  const bookmarksSearch = await supabaseClient
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    )
    .match({ status: 'active', user: user?.id })
    .order('created_at', { ascending: false })
    .limit(5);

  const tweetsSearch = await supabaseClient
    .from('tweets')
    .select('*', { count: 'exact' })
    .or(`text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*`)
    .match({ status: 'active', user: user?.id })
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    bookmarksSearch,
    tweetsSearch,
  };
};
