import { queryOptions } from '@tanstack/react-query'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

interface TootsFetchingOptions {
  params: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>
  likes: boolean
}
export const getToots = async ({ params, likes }: TootsFetchingOptions) => {
  const { limit, offset, order } = apiParameters(params)

  const supabaseResponse = await supabase
    .from('toots')
    .select('*', { count: 'exact' })
    .match({ liked_toot: likes })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset!, offset! + limit! - 1)

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

export const getTootsOptions = ({ params, likes }: TootsFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToots({ likes, params }),
    queryKey: ['toots', likes, params],
  })
}

interface TootFetchingOptions {
  id: string
}
export const getToot = async ({ id }: TootFetchingOptions) => {
  const supabaseResponse = await supabase
    .from('toots')
    .select('*')
    .match({ id })
    .single()

  return supabaseResponse
}

export const getTootOptions = ({ id }: TootFetchingOptions) => {
  return queryOptions({
    queryFn: () => getToot({ id }),
    queryKey: ['toots', id],
  })
}
