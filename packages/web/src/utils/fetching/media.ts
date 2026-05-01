import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MediaSearchItem } from 'worker/media/mediaSearch'
import type {
  Media,
  MediaFilters,
  MediaInsert,
  MediaStatus,
  MediaType,
  MediaUpdate,
} from '@/types/db'
import { getErrorMessage } from '../get-error-message'

export type GroupedMedia = Record<NonNullable<Media['status']>, Media[]>

type WorkerGroupedMedia = Partial<
  Record<MediaType, Partial<Record<MediaStatus, Media[]>>>
>

type SingleResponse<T> = {
  data: T
  error: null
}

const groupMediaByStatus = (media: Media[]) => {
  return Object.groupBy(
    media,
    (item) => item.status ?? 'wishlist',
  ) as GroupedMedia
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

const flattenWorkerMedia = (grouped: WorkerGroupedMedia) =>
  Object.values(grouped).flatMap((typeBucket) =>
    Object.values(typeBucket ?? {}).flatMap((items) => items ?? []),
  )

export const getMedia = async (filters: MediaFilters = {}) => {
  const response = await fetch('/api/media', { credentials: 'include' })
  const grouped = await parseJsonResponse<WorkerGroupedMedia>(response)
  const data = flattenWorkerMedia(grouped).filter((item) => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm) ||
        item.platform?.toLowerCase().includes(searchTerm) ||
        item.type?.toLowerCase().includes(searchTerm)

      if (!matchesSearch) {
        return false
      }
    }

    if (filters.type && item.type !== filters.type) {
      return false
    }

    if (filters.status && item.status !== filters.status) {
      return false
    }

    return true
  })

  return {
    count: data.length,
    data: groupMediaByStatus(data),
    error: null,
  }
}

export const getMediaOptions = (filters: MediaFilters = {}) => {
  return queryOptions({
    queryFn: () => getMedia(filters),
    queryKey: ['media', filters],
    staleTime: 5 * 1000,
  })
}

interface MediaFetchingOptions {
  id: number
}

export const getMediaItem = async ({ id }: MediaFetchingOptions) => {
  const response = await fetch(`/api/media/${id}`, { credentials: 'include' })
  return await parseJsonResponse<SingleResponse<Media>>(response)
}

export const getMediaItemOptions = ({ id }: MediaFetchingOptions) => {
  return queryOptions({
    queryFn: () => getMediaItem({ id }),
    queryKey: ['media', id],
    staleTime: 5 * 1000,
  })
}

export const useCreateMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MediaInsert) => {
      const response = await fetch('/api/media', {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      return await parseJsonResponse<SingleResponse<Media>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to create media item', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Media item created successfully')
    },
  })
}

export const useUpdateMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MediaUpdate }) => {
      const response = await fetch(`/api/media/${id}`, {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      return await parseJsonResponse<SingleResponse<Media>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to update media item', {
        description: errorMessage,
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success(`${data?.data.name} updated successfully`)
    },
  })
}

export const useUpdateMediaStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      items: Array<{
        id: number
        status: MediaStatus
        sortOrder?: number
      }>,
    ) => {
      return await Promise.all(
        items.map(({ id, status, sortOrder }) =>
          fetch(`/api/media/${id}`, {
            body: JSON.stringify({
              sort_order: sortOrder,
              status,
            }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          }).then((response) =>
            parseJsonResponse<SingleResponse<Media>>(response),
          ),
        ),
      )
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to update media status', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })
}

export const useDeleteMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/media/${id}`, {
        credentials: 'include',
        method: 'DELETE',
      })

      return await parseJsonResponse<SingleResponse<Media>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to delete media item', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Media item deleted successfully')
    },
  })
}

const getMediaSearch = async ({
  query,
  type,
}: {
  query: string
  type: MediaType
}) => {
  const response = await fetch(`/api/media-search?query=${query}&type=${type}`)
  const data = await response.json()
  return data as {
    count: number
    data: MediaSearchItem[]
  }
}

export const getMediaSearchOptions = ({
  query,
  type,
}: {
  query: string | undefined
  type: MediaType | undefined | null
}) => {
  return queryOptions({
    enabled: !!query && !!type,
    // @ts-expect-error - This will only run if query and type are defined
    queryFn: () => getMediaSearch({ query, type }),
    queryKey: ['media', query, type],
  })
}
