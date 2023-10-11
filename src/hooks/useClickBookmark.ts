import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const useClickBookmark = () => {
  const supabaseClient = createClientComponentClient();

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
        modified_at: new Date(),
      })
      .match({ id });
  };

  return handleClickRegister;
};
