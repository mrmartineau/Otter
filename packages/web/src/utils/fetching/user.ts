import type { SupabaseClient } from '@supabase/supabase-js'
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserProfile } from '@/types/db'
import type { Database } from '@/types/supabase'
import { supabase } from '../supabase/client'

export const getSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

export const getUserProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userProfile = await supabase
    .from('profiles')
    .select('*')
    .match({ id: user?.id })
    .single()

  return userProfile
}

export const getUserProfileOptions = () => {
  return queryOptions({
    queryFn: () => getUserProfile(),
    queryKey: ['userProfile'],
    staleTime: 5 * 1000,
  })
}

export const getUserProfileByApiKey = async (
  apiKey: string,
  supabaseClient: SupabaseClient<Database> = supabase
) => {
  const supabaseResponse = await supabaseClient
    .from('profiles')
    .select('*')
    .match({ api_key: apiKey })
    .single()

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

interface UpdateUserParams {
  column: string
  value: string | number | boolean | string[] | null
  id: string
}

const updateUser = async ({ column, value, id }: UpdateUserParams) => {
  return await supabase
    .from('profiles')
    .update({ [column]: value, updated_at: new Date().toISOString() })
    .match({ id })
}

export const updateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ column, value, id }: UpdateUserParams) => {
      const { error } = await updateUser({ column, id, value })

      if (error) {
        throw error
      }
    },
    onError: (error, _, context) => {
      toast.error(error.message)
      // @ts-expect-error this is ok. It is returned in the `onMutate` function
      queryClient.setQueryData(['userProfile'], context?.previousProfile)
    },
    onMutate: async ({ column, value }) => {
      await queryClient.cancelQueries({ queryKey: ['userProfile'] })

      const previousProfile = queryClient.getQueryData(['userProfile'])

      queryClient.setQueryData(
        ['userProfile'],
        (old: { data: UserProfile } | undefined) => {
          if (!old?.data) {
            return old
          }

          return {
            ...old,
            data: {
              ...old.data,
              [column]: value,
              updated_at: new Date().toISOString(),
            },
          }
        }
      )

      return { previousProfile }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('User settings updated successfully')
    },
  })
}
