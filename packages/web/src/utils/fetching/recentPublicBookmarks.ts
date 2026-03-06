import { queryOptions } from '@tanstack/react-query'
import type { Bookmark } from '@/types/db'

interface RecentPublicBookmarksResponse {
  data: Bookmark[]
  count: number
  limit: number
  offset: number
}

const fetchRecentPublicBookmarks = async (params: {
  limit?: number
  offset?: number
}): Promise<RecentPublicBookmarksResponse> => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const response = await fetch(`/api/recent?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch recent public bookmarks')
  }
  return response.json()
}

export const getRecentPublicBookmarksOptions = (
  params: { limit?: number; offset?: number } = {},
) => {
  return queryOptions({
    queryFn: () => fetchRecentPublicBookmarks(params),
    queryKey: ['recent-public-bookmarks', params],
    staleTime: 30 * 1000,
  })
}
