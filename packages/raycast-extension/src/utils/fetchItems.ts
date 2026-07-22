import { apiFetch } from '../api'
import type { Bookmark, MetaResponse } from '../types'

type ListResponse<T> = {
  count: number
  data: T[]
  error?: string | null
}

export const useFetchSearchItems = async (
  searchTerm: string = '',
  tag?: string,
) => {
  return await apiFetch<ListResponse<Bookmark>>(
    `/api/search${queryString({ q: searchTerm, tag })}`,
  )
}

export const useFetchRecentItems = async (tag?: string, limit: number = 60) => {
  return await apiFetch<ListResponse<Bookmark>>(
    `/api/bookmarks${queryString({ limit, status: 'active', tag })}`,
  )
}

export const useFetchMeta = async () => {
  const metadata = await apiFetch<MetaResponse>('/api/meta')

  return {
    collections: metadata.collections || [],
    tags: metadata.tags || [],
    types: metadata.types || [],
  }
}

const queryString = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  const value = searchParams.toString()
  return value ? `?${value}` : ''
}
