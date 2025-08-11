import { supabase } from '@/utils/supabase/client'

export const useClickBookmark = () => {
  const handleClickRegister = async (id: string) => {
    const selectItem = await supabase
      .from('bookmarks')
      .select('click_count')
      .match({ id })
      .single()
    const count = selectItem.data?.click_count as number
    await supabase
      .from('bookmarks')
      .update({
        click_count: count + 1,
        modified_at: new Date().toISOString(),
      })
      .match({ id })
  }

  return handleClickRegister
}
