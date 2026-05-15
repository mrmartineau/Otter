import {
  type InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Bookmark } from '@/types/db'

export type ShareKind = 'tag' | 'collection'

export interface Share {
  created_at: string
  id: string
  kind: ShareKind
  name: string
  token: string
}

export interface PublicShareResponse {
  count: number
  data: Bookmark[]
  kind: ShareKind
  limit: number
  name: string
  offset: number
  owner: {
    name: string | null
    username: string | null
  }
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

const sharesUrl = '/api/shares'

const fetchShares = async () => {
  const response = await fetch(sharesUrl, { credentials: 'include' })
  return parseJsonResponse<Share[]>(response)
}

export const getSharesOptions = () =>
  queryOptions({
    queryFn: fetchShares,
    queryKey: ['shares'],
  })

interface ShareMutationVars {
  kind: ShareKind
  name: string
  rotate?: boolean
}

export const useEnableShareMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, name, rotate }: ShareMutationVars) => {
      const response = await fetch(sharesUrl, {
        body: JSON.stringify({ kind, name, rotate: rotate ?? false }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return parseJsonResponse<{
        kind: ShareKind
        name: string
        token: string
      }>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shares'] })
    },
  })
}

export const useDisableShareMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, name }: { kind: ShareKind; name: string }) => {
      const params = new URLSearchParams({ kind, name })
      const response = await fetch(`${sharesUrl}?${params.toString()}`, {
        credentials: 'include',
        method: 'DELETE',
      })
      return parseJsonResponse<{ ok: boolean }>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shares'] })
    },
  })
}

const fetchPublicShare = async ({
  token,
  limit,
  offset,
}: {
  token: string
  limit: number
  offset: number
}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const response = await fetch(
    `/api/share/${encodeURIComponent(token)}?${params.toString()}`,
  )
  return parseJsonResponse<PublicShareResponse>(response)
}

export const getPublicShareInfiniteOptions = (token: string) => {
  const limit = DEFAULT_API_RESPONSE_LIMIT
  return infiniteQueryOptions<
    PublicShareResponse,
    Error,
    InfiniteData<PublicShareResponse, number>,
    ['public-share', string],
    number
  >({
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      fetchPublicShare({ limit, offset: pageParam, token }),
    queryKey: ['public-share', token],
  })
}
