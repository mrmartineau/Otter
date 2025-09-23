import { supabase } from '../supabase'

export const fetchSearchItems = async (
  searchTerm: string = '',
  tag?: string
) => {
  let query = supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })

  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', ['{}'])
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`)
    }
  }

  const supabaseResponse = await query

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const fetchRecentItems = async (tag?: string, limit: number = 60) => {
  let query = supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .limit(limit)
    .match({ status: 'active' })
    .order('created_at', { ascending: false })

  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', ['{}'])
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`)
    }
  }
  const supabaseResponse = await query

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}
export const fetchMeta = async () => {
  const [bookmarks, types, tags, collections] = await Promise.all([
    supabase.from('bookmark_counts').select('*').single(),
    supabase.from('types_count').select('*'),
    supabase.from('tags_count').select('*'),
    supabase.from('collection_tags_view').select('*'),
  ])

  const { all_count, top_count, trash_count, stars_count, public_count } =
    bookmarks?.data || {}

  return {
    all: all_count || 0,
    collections: collections.data || [],
    public: public_count || 0,
    stars: stars_count || 0,
    tags: tags.data || [],
    top: top_count || 0,
    trash: trash_count || 0,
    types: types.data || [],
  }
}
