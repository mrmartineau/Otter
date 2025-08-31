import type { SupabaseClient } from '@supabase/supabase-js'
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Media,
  MediaFilters,
  MediaInsert,
  MediaStatus,
  MediaUpdate,
} from '@/types/db'
import type { Database } from '@/types/supabase'
import { getErrorMessage } from '../get-error-message'
import { supabase } from '../supabase/client'

const groupMediaByStatus = (media: Media[]) => {
  return Object.groupBy(media, (item) => item.status ?? 'wishlist') as Record<
    NonNullable<Media['status']>,
    Media[]
  >
}

export const getMedia = async (
  filters: MediaFilters = {},
  supabaseClient: SupabaseClient<Database> = supabase
) => {
  let query = supabaseClient
    .from('media')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    query = query.or(
      `name.ilike.%${searchTerm}%,platform.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`
    )
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const supabaseResponse = await query

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return {
    ...supabaseResponse,
    data: groupMediaByStatus(supabaseResponse.data ?? []),
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
  const supabaseResponse = await supabase
    .from('media')
    .select('*')
    .eq('id', id)
    .single()

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getMediaItemOptions = ({ id }: MediaFetchingOptions) => {
  return queryOptions({
    queryFn: () => getMediaItem({ id }),
    queryKey: ['media', id],
    staleTime: 5 * 1000,
  })
}

// Mutation hooks
export const useCreateMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MediaInsert) => {
      const response = await supabase
        .from('media')
        .insert([data])
        .select()
        .single()

      if (response.error) {
        throw response.error
      }

      return response
    },
    onError: (
      error,
      _,
      context:
        | { previousData?: Array<[readonly unknown[], unknown]> }
        | undefined
    ) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(
          ([queryKey, data]: [readonly unknown[], unknown]) => {
            queryClient.setQueryData(queryKey, data)
          }
        )
      }

      const errorMessage = getErrorMessage(error)
      toast.error('Failed to create media item', {
        description: errorMessage,
      })
    },
    onMutate: async (data: MediaInsert) => {
      await queryClient.cancelQueries({ queryKey: ['media'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['media'] })

      queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) => {
        if (!old?.data) {
          return old
        }

        const optimisticItem = {
          ...data,
          created_at: new Date().toISOString(),
          id: Date.now(), // Temporary ID
          modified_at: new Date().toISOString(),
        }

        return {
          ...old,
          data: [optimisticItem, ...old.data],
        }
      })

      return { previousData }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
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
      const response = await supabase
        .from('media')
        .update({ ...data, modified_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (response.error) {
        throw response.error
      }

      return response
    },
    onError: (error, _variables, context: any) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }

      const errorMessage = getErrorMessage(error)
      toast.error('Failed to update media item', {
        description: errorMessage,
      })
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['media'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['media'] })

      queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) => {
        if (!old?.data) {
          return old
        }

        return {
          ...old,
          data: old.data.map((item: any) =>
            item.id === id
              ? {
                  ...item,
                  ...data,
                  modified_at: new Date().toISOString(),
                }
              : item
          ),
        }
      })

      return { previousData }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Media item updated successfully')
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
      }>
    ) => {
      const now = new Date().toISOString()
      const payload = items.map(({ id, status, sortOrder }) => ({
        id,
        modified_at: now,
        sort_order: sortOrder,
        status,
      }))

      const response = await supabase
        .from('media')
        .upsert(payload, { onConflict: 'id' })
        .select()

      if (response.error) {
        throw response.error
      }

      return response
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
      const response = await supabase.from('media').delete().eq('id', id)

      if (response.error) {
        throw response.error
      }

      return response
    },
    onError: (error, _id, context) => {
      if (context?.previousMedia) {
        queryClient.setQueryData(['media'], context.previousMedia)
      }
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to delete media item', {
        description: errorMessage,
      })
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['media'] })

      const previousMedia = queryClient.getQueryData(['media'])

      queryClient.setQueryData(['media'], (old: any) => {
        if (!old || !old.data) {
          return old
        }

        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== id),
        }
      })

      return { previousMedia }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Media item deleted successfully')
    },
  })
}
