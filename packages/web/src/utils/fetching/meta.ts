import { queryOptions } from '@tanstack/react-query'
import type { BookmarkType } from '../../types/db'

export interface DbMetaResponse {
  all: number
  top: number
  public: number
  stars: number
  trash: number
  types: MetaType[]
  tags: MetaTag[]
  toots: number
  likedToots: number
  tweets: number
  likedTweets: number
  collections?: CollectionType[]
}

export interface MetaTag {
  count: number | null
  tag: string | null
}

export interface MetaType {
  count: number | null
  type: BookmarkType | null
}

export interface CollectionType {
  bookmark_count: number | null
  collection: string | null
  tags: string[] | null
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as {
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(body.error || body.reason || 'Request failed')
  }

  return body as T
}

export const getDbMetadata = async (): Promise<DbMetaResponse> => {
  const response = await fetch('/api/meta', { credentials: 'include' })
  return await parseJsonResponse<DbMetaResponse>(response)
}

export const getMetaOptions = () => {
  return queryOptions({
    queryFn: () => getDbMetadata(),
    queryKey: ['meta'],
    staleTime: 5 * 1000,
  })
}
