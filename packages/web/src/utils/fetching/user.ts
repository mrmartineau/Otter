import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserProfile } from '@/types/db'
import { authClient } from '../auth/client'

export const getSession = async () => {
  const { data: session } = await authClient.getSession()
  return session
}

export const getUserProfile = async () => {
  const response = await fetch('/api/me', {
    credentials: 'include',
  })

  const userProfile = (await response.json()) as {
    data?: UserProfile
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(userProfile.error || userProfile.reason)
  }

  return userProfile as { data: UserProfile }
}

export const getUserProfileOptions = () => {
  return queryOptions({
    queryFn: () => getUserProfile(),
    queryKey: ['userProfile'],
    staleTime: 5 * 1000,
  })
}

interface UpdateUserParams {
  column: string
  value: string | number | boolean | string[] | null
  id: string
}

const updateUser = async ({ column, value, id }: UpdateUserParams) => {
  const response = await fetch('/api/me', {
    body: JSON.stringify({ column, id, value }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  })

  const userProfile = (await response.json()) as {
    data?: UserProfile
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(userProfile.error || userProfile.reason)
  }

  return { data: userProfile.data as UserProfile, error: null }
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
        },
      )

      return { previousProfile }
    },
    onSettled: async () => {
      toast.success('User settings updated successfully')
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })
}
