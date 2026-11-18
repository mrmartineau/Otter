import popOffSfx from '@mrmartineau/kit/sounds/pop-off.mp3'
import popOnSfx from '@mrmartineau/kit/sounds/pop-on.mp3'
import popUpOffSfx from '@mrmartineau/kit/sounds/pop-up-off.mp3'
import popUpOnSfx from '@mrmartineau/kit/sounds/pop-up-on.mp3'
import useSound from '@mrmartineau/use-sound'
import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'
import type { Bookmark } from '@/types/db'
import { updateBookmark } from '@/utils/fetching/bookmarks'

type ToggleColumn = 'public' | 'star'

export const useToggleBookmarkState = ({
  id,
  star,
  public: isPublic,
  title,
}: Pick<Bookmark, 'id' | 'star' | 'public' | 'title'>) => {
  const queryClient = useQueryClient()
  const [playPopOn] = useSound(popOnSfx, { volume: 0.3 })
  const [playPopOff] = useSound(popOffSfx, { volume: 0.3 })
  const [playPopUpOn] = useSound(popUpOnSfx, { volume: 0.3 })
  const [playPopUpOff] = useSound(popUpOffSfx, { volume: 0.3 })
  // `star` and `isPublic` only change after the refetch. A second click before
  // then would send the same value again, so it is ignored.
  const pending = useRef(new Set<ToggleColumn>())

  return async (column: ToggleColumn): Promise<void> => {
    if (pending.current.has(column)) {
      return
    }
    pending.current.add(column)
    const updateData =
      column === 'public' ? { public: !isPublic } : { star: !star }
    try {
      await updateBookmark(id, updateData)
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    } finally {
      pending.current.delete(column)
    }
    const label =
      column === 'public'
        ? !isPublic
          ? 'Made public'
          : 'Made private'
        : !star
          ? 'Starred'
          : 'Unstarred'
    if (column === 'public') {
      !isPublic ? playPopOn() : playPopOff()
    } else {
      !star ? playPopUpOn() : playPopUpOff()
    }
    toast.success(label, {
      description: title || undefined,
    })
  }
}
