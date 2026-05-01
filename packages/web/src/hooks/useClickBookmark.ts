import { incrementBookmarkClickCount } from '@/utils/fetching/bookmarks'

export const useClickBookmark = () => {
  const handleClickRegister = async (id: string) => {
    await incrementBookmarkClickCount(id)
  }

  return handleClickRegister
}
