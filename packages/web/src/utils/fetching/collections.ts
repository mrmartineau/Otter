import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { type ApiParametersQuery, apiParameters } from './apiParameters'
import type { CollectionType } from './meta'

interface CollectionsFetchingOptions {
  name: string
  params: Partial<ApiParametersQuery>
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

export const getCollections = async ({
  params,
  name,
}: CollectionsFetchingOptions) => {
  const parsed = apiParameters(params)
  const response = await fetch(
    `/api/collections/${encodeURIComponent(name)}${queryString(parsed)}`,
    { credentials: 'include' },
  )
  const body = await parseJsonResponse<{
    count: number
    data: Bookmark[]
    error: null
  }>(response)

  return body
}

export const getCollectionsOptions = ({
  name,
  params,
}: CollectionsFetchingOptions) => {
  return queryOptions({
    queryFn: () => getCollections({ name, params }),
    queryKey: ['collections', name, params],
  })
}

export const getCollectionsInfiniteOptions = ({
  name,
  params,
}: CollectionsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getCollections>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getCollections({ name, params: { ...rest, limit, offset: pageParam } }),
    queryKey: ['collections', 'infinite', name, rest, limit],
  })
}

export const getCollectionsTags = async () => {
  const response = await fetch('/api/collections-tags', {
    credentials: 'include',
  })

  return await parseJsonResponse<CollectionType[]>(response)
}

export const getCollectionsTagsOptions = () => {
  return queryOptions({
    queryFn: () => getCollectionsTags(),
    queryKey: ['collectionsTags'],
  })
}
