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

export type GroupedMedia = Record<NonNullable<Media['status']>, Media[]>

const groupMediaByStatus = (media: Media[]) => {
  return Object.groupBy(
    media,
    (item) => item.status ?? 'wishlist'
  ) as GroupedMedia
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
