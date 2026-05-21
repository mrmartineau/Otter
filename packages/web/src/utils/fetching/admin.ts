import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AdminStats, AdminUser, UserRole } from '@/types/db'

interface ApiResponse<T> {
  data?: T
  error?: string
  reason?: string
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as ApiResponse<T>

  if (!response.ok || body.data === undefined) {
    throw new Error(body.error || body.reason || 'Request failed')
  }

  return body.data
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await fetch('/api/admin/stats', { credentials: 'include' })
  return parseJsonResponse<AdminStats>(response)
}

export const getAdminStatsOptions = () =>
  queryOptions({
    queryFn: getAdminStats,
    queryKey: ['admin', 'stats'],
    staleTime: 30 * 1000,
  })

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await fetch('/api/admin/users', { credentials: 'include' })
  return parseJsonResponse<AdminUser[]>(response)
}

export const getAdminUsersOptions = () =>
  queryOptions({
    queryFn: getAdminUsers,
    queryKey: ['admin', 'users'],
    staleTime: 30 * 1000,
  })

interface UpdateUserParams {
  id: string
  role?: UserRole
  daily_bookmark_limit_override?: number | null
}

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserParams) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        body: JSON.stringify(body),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      return parseJsonResponse<{ id: string }>(response)
    },
    onError: (error: Error) => toast.error(error.message),
    onSuccess: async () => {
      toast.success('User updated')
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
