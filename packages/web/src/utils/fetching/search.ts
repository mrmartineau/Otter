import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Bookmark, Toot, Tweet } from '@/types/db'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

type ApiListResponse<T> = {
  data: T
  count: number | null
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

interface SearchFetchingOptions {
  params: Partial<ApiParametersQuery>
  searchTerm: string
  userId?: string
}

const getSearchResults = async <T>(
  path: string,
  searchTerm: string,
  params: Partial<ApiParametersQuery>,
) => {
  const parsed = apiParameters(params)
  const response = await fetch(
    `${path}${queryString({ ...parsed, q: searchTerm })}`,
    {
      credentials: 'include',
    },
  )
  const body = await parseJsonResponse<{ data: T[]; count: number }>(response)

  return {
    count: body.count,
    data: body.data,
    error: null,
  } satisfies ApiListResponse<T[]>
}

export const getSearchBookmarks = async ({
  searchTerm,
  params,
}: SearchFetchingOptions) =>
  await getSearchResults<Bookmark>('/api/search', searchTerm, params)

export const getSearchBookmarksOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchBookmarks({ params, searchTerm }),
    queryKey: ['bookmarks', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
}

export const getSearchBookmarksInfiniteOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getSearchBookmarks>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getSearchBookmarks({
        params: { ...rest, limit, offset: pageParam },
        searchTerm,
      }),
    queryKey: ['bookmarks', 'search', 'infinite', rest, limit, searchTerm],
    staleTime: 5 * 1000,
  })
}

export const getSearchTweets = async ({
  searchTerm,
  params,
}: SearchFetchingOptions) =>
  await getSearchResults<Tweet>('/api/search/tweets', searchTerm, params)

export const getSearchTweetsOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchTweets({ params, searchTerm }),
    queryKey: ['tweets', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
}

export const getSearchToots = async ({
  searchTerm,
  params,
}: SearchFetchingOptions) =>
  await getSearchResults<Toot>('/api/search/toots', searchTerm, params)

export const getSearchTootsOptions = ({
  searchTerm,
  params,
}: Pick<SearchFetchingOptions, 'searchTerm' | 'params'>) => {
  return queryOptions({
    queryFn: () => getSearchToots({ params, searchTerm }),
    queryKey: ['toots', 'search', params, searchTerm],
    staleTime: 5 * 1000,
  })
}
