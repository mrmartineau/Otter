import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { HonoRequest } from 'hono'
import type { Database } from '@/types/supabase'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getUserProfileByApiKey } from '@/utils/fetching/user'
import { getErrorMessage } from '@/utils/get-error-message'
import { supabaseUrl } from '@/utils/supabase/client'

type AuthenticatedClient = {
  client: SupabaseClient<Database>
  user: Database['public']['Tables']['profiles']['Row']
}

export const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY

export const createAuthenticatedClient = async (
  request: HonoRequest,
): Promise<AuthenticatedClient | Response> => {
  const authHeader = request.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse({
      error: 'Authorization header must be in format: Bearer <token>',
      reason: 'Missing or invalid Authorization header',
      status: 401,
    })
  }

  const bearerToken = authHeader.split(' ')[1]
  if (!bearerToken) {
    return errorResponse({
      error: 'Bearer token is required',
      reason: 'Missing bearer token',
      status: 401,
    })
  }

  if (!supabaseUrl) {
    return errorResponse({
      error: 'Supabase URL not configured',
      reason: 'Server configuration error',
      status: 500,
    })
  }

  const client = createClient<Database>(supabaseUrl, supabaseServiceKey)
  const { data, error } = await getUserProfileByApiKey(bearerToken, client)

  if (error) {
    const errorMessage = getErrorMessage(error)
    return errorResponse({
      error: 'Failed to get user profile from API key',
      reason: errorMessage,
      status: 500,
    })
  }

  return { client, user: data }
}
