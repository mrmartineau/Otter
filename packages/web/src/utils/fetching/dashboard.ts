import { queryOptions } from '@tanstack/react-query'
import type { Bookmark } from '../../types/db'

interface DashboardFetchingResponse {
  recent: Bookmark[]
  oneWeekAgo: Bookmark[]
  oneMonthAgo: Bookmark[]
  twoMonthsAgo: Bookmark[]
  sixMonthsAgo: Bookmark[]
  oneYearAgo: Bookmark[]
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as {
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(body.error || body.reason || 'Request failed')
  }

  return body as T
}

export const getDashboard = async (): Promise<DashboardFetchingResponse> => {
  const response = await fetch('/api/dashboard', {
    credentials: 'include',
  })

  return await parseJsonResponse<DashboardFetchingResponse>(response)
}

export const getDashboardOptions = () => {
  return queryOptions({
    queryFn: () => getDashboard(),
    queryKey: ['bookmarks', 'dashboard'],
    staleTime: 5 * 1000,
  })
}
