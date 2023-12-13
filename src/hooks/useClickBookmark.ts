'use client';

import { createBrowserClient } from '../utils/supabase/client';

export const useClickBookmark = () => {
  const supabaseClient = createBrowserClient();

  const handleClickRegister = async (id: string) => {
    const selectItem = await supabaseClient
      .from('bookmarks')
      .select('click_count')
      .match({ id })
      .single();
    const count = selectItem.data?.click_count as number;
    await supabaseClient
      .from('bookmarks')
      .update({
        click_count: count + 1,
        modified_at: new Date().toISOString(),
      })
      .match({ id });
  };

  return handleClickRegister;
};
