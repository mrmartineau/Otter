import { Database } from '@/src/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export interface MetaResponse {
  all: number;
  stars: number;
  trash: number;
  types: MetaType[];
  tags: MetaTag[];
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
): Promise<MetaResponse> => {
  const all = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ status: 'active' });
  const trash = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ status: 'inactive' });
  const stars = await supabaseClient
    .from('bookmarks')
    .select('id', { count: 'exact' })
    .match({ star: true, status: 'active' });
  const types = await supabaseClient.from('types_count').select('*');
  const tags = await supabaseClient.from('tags_count').select('*');

  return {
    all: all.count || 0,
    trash: trash.count || 0,
    stars: stars.count || 0,
    types: types.data || [],
    tags: tags.data || [],
  };
};
