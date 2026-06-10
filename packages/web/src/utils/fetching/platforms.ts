import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { PLATFORMS, type PlatformId } from '@/platforms/catalog'
import type { Bookmark, PlatformConnection, PlatformItem } from '@/types/db'
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

// Connections

export const getPlatformConnectionsOptions = () => {
  return queryOptions({
    queryFn: async () => {
      const response = await fetch('/api/platforms', {
        credentials: 'include',
      })
      const body = await parseJsonResponse<{ data: PlatformConnection[] }>(
        response,
      )
      return body.data
    },
    queryKey: ['platformConnections'],
  })
}

interface UpsertPlatformParams {
  platform: PlatformId
  credentials: Record<string, string>
  enabled?: boolean
}

export const useUpsertPlatformMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      platform,
      credentials,
      enabled,
    }: UpsertPlatformParams) => {
      const response = await fetch(`/api/platforms/${platform}`, {
        body: JSON.stringify({ credentials, enabled }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      })

      await parseJsonResponse<{ data: PlatformConnection }>(response)
    },
    onError: (error) => {
      toast.error(`Failed to save connection: ${error.message}`)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformConnections'] })
    },
    onSuccess: (_, variables) => {
      toast.success(`${PLATFORMS[variables.platform].name} connection saved`)
    },
  })
}

export const useTogglePlatformMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      platform,
      enabled,
    }: {
      platform: PlatformId
      enabled: boolean
    }) => {
      const response = await fetch(`/api/platforms/${platform}`, {
        body: JSON.stringify({ enabled }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      await parseJsonResponse<{ data: PlatformConnection }>(response)
    },
    onError: (error) => {
      toast.error(`Failed to update connection: ${error.message}`)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformConnections'] })
    },
  })
}

export const useDeletePlatformMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ platform }: { platform: PlatformId }) => {
      const response = await fetch(`/api/platforms/${platform}`, {
        credentials: 'include',
        method: 'DELETE',
      })

      await parseJsonResponse<{ data: null }>(response)
    },
    onError: (error) => {
      toast.error(`Failed to remove connection: ${error.message}`)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformConnections'] })
      await queryClient.invalidateQueries({ queryKey: ['platformItems'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
    onSuccess: (_, variables) => {
      toast.success(`${PLATFORMS[variables.platform].name} connection removed`)
    },
  })
}

export const useSyncPlatformMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ platform }: { platform: PlatformId }) => {
      const response = await fetch(`/api/platforms/${platform}/sync`, {
        credentials: 'include',
        method: 'POST',
      })
      const body = await parseJsonResponse<{
        data: { added: number; fetched: number }
      }>(response)
      return body.data
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformConnections'] })
      await queryClient.invalidateQueries({ queryKey: ['platformItems'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
    onSuccess: (result, variables) => {
      toast.success(
        `${PLATFORMS[variables.platform].name}: ${result.added} new ${
          result.added === 1
            ? PLATFORMS[variables.platform].itemName
            : `${PLATFORMS[variables.platform].itemName}s`
        }`,
      )
    },
  })
}

// Items

interface PlatformItemsFetchingOptions {
  platform: PlatformId
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
}

export const getPlatformItems = async ({
  platform,
  params,
}: PlatformItemsFetchingOptions) => {
  const parsed = apiParameters(params)
  const response = await fetch(
    `/api/platform-items${queryString({ ...parsed, platform })}`,
    {
      credentials: 'include',
    },
  )
  const body = await parseJsonResponse<{
    data: PlatformItem[]
    count: number
  }>(response)

  return {
    count: body.count,
    data: body.data,
    error: null,
  } satisfies ApiListResponse<PlatformItem[]>
}

export const getPlatformItemsInfiniteOptions = ({
  platform,
  params,
}: PlatformItemsFetchingOptions) => {
  const {
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset: _offset,
    ...rest
  } = apiParameters(params)
  return infiniteQueryOptions({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof getPlatformItems>>,
      _allPages,
      lastPageParam,
    ) => {
      const total = lastPage.count ?? 0
      const nextOffset = lastPageParam + limit
      return nextOffset < total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getPlatformItems({
        params: { ...rest, limit, offset: pageParam },
        platform,
      }),
    queryKey: ['platformItems', 'infinite', platform, rest, limit],
  })
}

export const useConvertPlatformItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; platform: PlatformId }) => {
      const response = await fetch(`/api/platform-items/${id}/bookmark`, {
        credentials: 'include',
        method: 'POST',
      })
      const body = await parseJsonResponse<{ data: Bookmark }>(response)
      return body.data
    },
    onError: (error) => {
      toast.error(`Failed to add bookmark: ${error.message}`)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformItems'] })
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
    onSuccess: () => {
      toast.success('Bookmark added')
    },
  })
}
