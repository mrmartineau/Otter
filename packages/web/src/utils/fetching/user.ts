import type { SupabaseClient } from '@supabase/supabase-js'
import { queryOptions } from '@tanstack/react-query'
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
