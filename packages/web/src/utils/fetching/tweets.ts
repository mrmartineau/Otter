import { infiniteQueryOptions } from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Tweet } from '@/types/db'
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

interface TweetsFetchingOptions {
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
  likes: boolean
}

export const getTweets = async ({ params, likes }: TweetsFetchingOptions) => {
  const parsed = apiParameters(params)
  const response = await fetch(
    `/api/tweets${queryString({ ...parsed, liked: likes })}`,
    {
      credentials: 'include',
    },
  )
  const body = await parseJsonResponse<{ data: Tweet[]; count: number }>(
    response,
  )

  return {
    count: body.count,
    data: body.data,
    error: null,
  } satisfies ApiListResponse<Tweet[]>
}

export const getTweetsInfiniteOptions = ({
  params,
  likes,
}: TweetsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getTweets>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getTweets({ likes, params: { ...rest, limit, offset: pageParam } }),
    queryKey: ['tweets', 'infinite', likes, rest, limit],
  })
}

interface TweetFetchingOptions {
  id: string
}

export const getTweet = async ({ id }: TweetFetchingOptions) => {
  const response = await fetch(`/api/tweets/${id}`, {
    credentials: 'include',
  })

  return await parseJsonResponse<SingleResponse<Tweet>>(response)
}
