import { useNavigate, type FileRouteTypes } from '@tanstack/react-router'
import { useMemo } from 'react'

interface UsePaginationModel {
  offset: number
  limit: number
  count: number
  from?: FileRouteTypes['fullPaths']
}

export const usePagination = ({
  offset,
  limit,
  count,
  from = '/feed',
}: UsePaginationModel) => {
  const navigate = useNavigate()
  const handleUpdateOffset = (newOffset: number) => {
    return navigate({
      from,
      search: {
        // @ts-expect-error Fix `search` typings
        limit: limit,
        offset: newOffset,
      },
      to: from,
      resetScroll: true,
    })
  }
  const hasOldItems = useMemo(
    () => Number(offset) + Number(limit) < Number(count),
    [offset, limit, count]
  )
  const hasNewItems = useMemo(() => Number(offset) > 0, [offset])

  return {
    handleUpdateOffset,
    hasNewItems,
    hasOldItems,
  }
}
