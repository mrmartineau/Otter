import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserIntegration } from '@/types/db'

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

export const getIntegrationOptions = (userId: string) => {
  return queryOptions({
    queryFn: async () => {
      const response = await fetch('/api/integrations/bluesky', {
        credentials: 'include',
      })

      return await parseJsonResponse<UserIntegration | null>(response)
    },
    queryKey: ['userIntegrations', userId],
  })
}

interface UpsertBlueskyParams {
  userId: string
  handle: string
  appPassword: string
  enabled: boolean
  postPrefix: string
  postSuffix: string
}

export const useUpsertBlueskyMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      handle,
      appPassword,
      enabled,
      postPrefix,
      postSuffix,
    }: UpsertBlueskyParams) => {
      const response = await fetch('/api/integrations/bluesky', {
        body: JSON.stringify({
          appPassword,
          enabled,
          handle,
          postPrefix,
          postSuffix,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      })

      await parseJsonResponse<UserIntegration>(response)
    },
    onError: (error) => {
      toast.error(`Failed to save Bluesky settings: ${error.message}`)
    },
    onSettled: async (_, __, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['userIntegrations', variables.userId],
      })
    },
    onSuccess: () => {
      toast.success('Bluesky settings saved')
    },
  })
}

export const useToggleBlueskyMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ enabled }: { userId: string; enabled: boolean }) => {
      const response = await fetch('/api/integrations/bluesky', {
        body: JSON.stringify({ enabled }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      await parseJsonResponse<UserIntegration>(response)
    },
    onError: (error) => {
      toast.error(`Failed to update Bluesky: ${error.message}`)
    },
    onSettled: async (_, __, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['userIntegrations', variables.userId],
      })
    },
  })
}
