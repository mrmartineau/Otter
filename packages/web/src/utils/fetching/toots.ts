import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Toot } from '@/types/db'
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

interface TootsFetchingOptions {
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
  likes: boolean
}

export const getToots = async ({
  params,
  likes = false,
}: TootsFetchingOptions) => {
  const parsed = apiParameters(params)
  const response = await fetch(
    `/api/toots${queryString({ ...parsed, liked: likes })}`,
    {
      credentials: 'include',
    },
  )
  const body = await parseJsonResponse<{ data: Toot[]; count: number }>(
    response,
  )

  return {
    count: body.count,
    data: body.data,
    error: null,
  } satisfies ApiListResponse<Toot[]>
}

export const getTootsOptions = ({ params, likes }: TootsFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToots({ likes, params }),
    queryKey: ['toots', likes, params],
  })
}

export const getTootsInfiniteOptions = ({
  params,
  likes,
}: TootsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getToots>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getToots({ likes, params: { ...rest, limit, offset: pageParam } }),
    queryKey: ['toots', 'infinite', likes, rest, limit],
  })
}

interface TootFetchingOptions {
  id: string
}

export const getToot = async ({ id }: TootFetchingOptions) => {
  const response = await fetch(`/api/toots/${id}`, {
    credentials: 'include',
  })

  return await parseJsonResponse<SingleResponse<Toot>>(response)
}

export const getTootOptions = ({ id }: TootFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToot({ id }),
    queryKey: ['toots', id],
  })
}
