import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'

interface UsePaginationModel {
  offset: number
  limit: number
  count: number
}
export const usePagination = ({ offset, limit, count }: UsePaginationModel) => {
  const navigate = useNavigate()
  const handleUpdateOffset = (newOffset: number) => {
    return navigate({
      from: '/feed',
      search: {
        limit: limit,
        offset: newOffset,
      },
      to: '/feed',
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
