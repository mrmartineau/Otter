import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Bookmark, BookmarkFormValues } from '@/types/db'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

type ApiListResponse<T> = {
  data: T
  count: number | null
  error: null
}

type SingleResponse<T> = {
  data: T
  error: null
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

export const getBookmarks = async (
  params: Partial<ApiParametersQuery> = {},
) => {
  const parsed = apiParameters(params)
  const response = await fetch(`/api/bookmarks${queryString(parsed)}`, {
    credentials: 'include',
  })
  const body = await parseJsonResponse<{
    data: Bookmark[]
    count: number
  }>(response)

  return {
    count: body.count,
    data: body.data,
    error: null,
  } satisfies ApiListResponse<Bookmark[]>
}

export const getBookmarksOptions = (params: Partial<ApiParametersQuery>) => {
  return queryOptions({
    queryFn: () => getBookmarks(params),
    queryKey: ['bookmarks', params],
    staleTime: 5 * 1000,
  })
}

export const getBookmarksInfiniteOptions = (
  params: Partial<ApiParametersQuery>,
) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getBookmarks>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getBookmarks({ ...rest, limit, offset: pageParam }),
    queryKey: ['bookmarks', 'infinite', rest, limit],
    staleTime: 5 * 1000,
  })
}

interface BookmarkFetchingOptions {
  id: string
}

export const getBookmark = async ({ id }: BookmarkFetchingOptions) => {
  const response = await fetch(`/api/bookmarks/${id}`, {
    credentials: 'include',
  })

  return await parseJsonResponse<SingleResponse<Bookmark>>(response)
}

export const getBookmarkOptions = ({ id }: BookmarkFetchingOptions) => {
  return queryOptions({
    queryFn: () => getBookmark({ id }),
    queryKey: ['bookmarks', id],
    staleTime: 5 * 1000,
  })
}

export const createBookmark = async (bookmark: BookmarkFormValues) => {
  const response = await fetch('/api/bookmarks', {
    body: JSON.stringify(bookmark),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  return await parseJsonResponse<SingleResponse<Bookmark>>(response)
}

export const updateBookmark = async (
  id: string,
  bookmark: Partial<BookmarkFormValues | Bookmark>,
) => {
  const response = await fetch(`/api/bookmarks/${id}`, {
    body: JSON.stringify(bookmark),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  })

  return await parseJsonResponse<SingleResponse<Bookmark>>(response)
}

export const deleteBookmark = async (id: string) => {
  const response = await fetch(`/api/bookmarks/${id}`, {
    credentials: 'include',
    method: 'DELETE',
  })

  return await parseJsonResponse<SingleResponse<Bookmark>>(response)
}

export const incrementBookmarkClickCount = async (id: string) => {
  const response = await fetch(`/api/bookmarks/${id}/click`, {
    credentials: 'include',
    method: 'POST',
  })

  return await parseJsonResponse<SingleResponse<Bookmark>>(response)
}

export const checkBookmarkUrl = async (urlInput: string) => {
  const response = await fetch(
    `/api/check-url${queryString({ url_input: urlInput })}`,
    { credentials: 'include' },
  )

  return await parseJsonResponse<SingleResponse<Bookmark[]>>(response)
}
