import { queryOptions } from '@tanstack/react-query'
import { supabase } from '../supabase/client'
import { type ApiParametersQuery, apiParameters } from './apiParameters'

interface CollectionsFetchingOptions {
  params: Partial<ApiParametersQuery>
  name: string
}
export const getCollections = async ({
  params,
  name,
}: CollectionsFetchingOptions) => {
  const {
    limit,
    offset,
    star,
    type,
    status,
    public: publicItems,
  } = apiParameters(params)
  let query = supabase
    .rpc(
      'get_bookmarks_by_collection',
      {
        collection_name: name,
      },
      { count: 'exact' },
    )
    .range(offset!, offset! + limit! - 1)

  if (status) {
    query = query.match({ status })
  }
  if (star) {
    query = query.match({ star })
  }
  if (type) {
    query = query.match({ type })
  }
  if (publicItems) {
    query = query.match({ public: publicItems })
  }

  const supabaseResponse = await query

  if (supabaseResponse.error) {
    throw supabaseResponse.error
  }

  return supabaseResponse
}

interface CollectionsFetchingOptions {
  name: string
  params: Partial<ApiParametersQuery>
}

export const getCollectionsOptions = ({
  name,
  params,
}: CollectionsFetchingOptions) => {
  return queryOptions({
    queryFn: () => getCollections({ name, params }),
    queryKey: ['collections', name, params],
  })
}

export const getCollectionsTags = async () => {
  const { data, error } = await supabase
    .from('collection_tags_view')
    .select('*')
  if (error) {
    throw error
  }

  return data
}

export const getCollectionsTagsOptions = () => {
  return queryOptions({
    queryFn: () => getCollectionsTags(),
    queryKey: ['collectionsTags'],
  })
}
