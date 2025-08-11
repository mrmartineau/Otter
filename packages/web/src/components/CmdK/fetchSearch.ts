import { supabase } from '@/utils/supabase/client'

export const fetchSearch = async (searchTerm: string) => {
  const bookmarksSearch = await supabase
    .from('bookmarks')
    .select('id,title,description,note,url,type,tags,created_at', {
      count: 'exact',
    })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })
    .limit(5)
  const tweetsSearch = await supabase
    .from('tweets')
    .select('*', { count: 'exact' })
    .or(
      `text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*,hashtags.cs.{${searchTerm}}`,
    )
    .order('created_at', { ascending: false })
    .limit(5)
  const tootsSearch = await supabase
    .from('toots')
    .select('*', { count: 'exact' })
    .or(
      `text.ilike.*${searchTerm}*,user_name.ilike.*${searchTerm}*,user_id.ilike.*${searchTerm}*,hashtags.cs.{${searchTerm}}`,
    )
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    bookmarksSearch: bookmarksSearch.data,
    tootsSearch: tootsSearch.data,
    tweetsSearch: tweetsSearch.data,
  }
}
