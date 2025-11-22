import { type FileRouteTypes, useNavigate } from '@tanstack/react-router'
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
      resetScroll: true,
      search: {
        // @ts-expect-error Fix `search` typings
        limit: limit,
        offset: newOffset,
      },
      to: from,
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
