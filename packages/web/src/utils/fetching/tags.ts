import { queryOptions } from '@tanstack/react-query'
import { supabase } from '../supabase/client'

export const getTags = async () => {
  const { data, error } = await supabase.from('tags_count').select('*')
  if (error) {
    throw error
  }
  return data
}

export const getTagsOptions = () => {
  return queryOptions({
    queryFn: () => getTags(),
    queryKey: ['tags'],
  })
}
