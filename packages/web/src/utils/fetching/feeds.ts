import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

export interface FeedSubscription {
  created_at: string
  description: string | null
  feed_url: string
  folder: string | null
  id: string
  site_url: string | null
  title: string | null
  updated_at: string | null
}

export interface FeedSubscriptionsResponse {
  count: number
  data: FeedSubscription[]
}

export interface OpmlImportResult {
  added: number
  skipped: number
  total: number
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

const feedsUrl = '/api/feeds'

export const getFeedSubscriptions = async () => {
  const response = await fetch(feedsUrl, { credentials: 'include' })
  return parseJsonResponse<FeedSubscriptionsResponse>(response)
}

export const getFeedSubscriptionsOptions = () =>
  queryOptions({
    queryFn: getFeedSubscriptions,
    queryKey: ['feed-subscriptions'],
    staleTime: 5 * 1000,
  })

export const getFeedSubscription = async (id: string) => {
  const response = await fetch(`${feedsUrl}/${id}`, {
    credentials: 'include',
  })
  return parseJsonResponse<{ data: FeedSubscription }>(response)
}

export const getFeedSubscriptionOptions = (id: string) =>
  queryOptions({
    queryFn: () => getFeedSubscription(id),
    queryKey: ['feed-subscriptions', id],
  })

export const useAddFeedSubscriptionMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ url, folder }: { url: string; folder?: string }) => {
      const response = await fetch(feedsUrl, {
        body: JSON.stringify({ folder: folder || null, url }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return parseJsonResponse<{ data: FeedSubscription }>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed-subscriptions'] })
    },
  })
}

export const useUpdateFeedSubscriptionMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      title,
      folder,
    }: {
      id: string
      title?: string
      folder?: string | null
    }) => {
      const response = await fetch(`${feedsUrl}/${id}`, {
        body: JSON.stringify({ folder, title }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      return parseJsonResponse<{ data: FeedSubscription }>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed-subscriptions'] })
    },
  })
}

export const useDeleteFeedSubscriptionMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await fetch(`${feedsUrl}/${id}`, {
        credentials: 'include',
        method: 'DELETE',
      })
      return parseJsonResponse<{ ok: boolean }>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed-subscriptions'] })
    },
  })
}

export const useImportOpmlMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ opml }: { opml: string }) => {
      const response = await fetch(`${feedsUrl}/import`, {
        body: JSON.stringify({ opml }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return parseJsonResponse<OpmlImportResult>(response)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed-subscriptions'] })
    },
  })
}

export const groupSubscriptionsByFolder = (
  subscriptions: FeedSubscription[],
) => {
  const folders = new Map<string, FeedSubscription[]>()
  const unfiled: FeedSubscription[] = []

  for (const subscription of subscriptions) {
    if (subscription.folder) {
      const group = folders.get(subscription.folder) ?? []
      group.push(subscription)
      folders.set(subscription.folder, group)
    } else {
      unfiled.push(subscription)
    }
  }

  return {
    folders: [...folders.entries()]
      .map(([folder, feeds]) => ({ feeds, folder }))
      .sort((a, b) => a.folder.localeCompare(b.folder)),
    unfiled,
  }
}
