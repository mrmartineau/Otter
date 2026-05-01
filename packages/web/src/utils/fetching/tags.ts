import { queryOptions } from '@tanstack/react-query'
import type { MetaTag } from './meta'

export const getTags = async () => {
  const response = await fetch('/api/tags', { credentials: 'include' })
  const body = (await response.json()) as {
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(body.error || body.reason || 'Failed to fetch tags')
  }

  return body as MetaTag[]
}

export const getTagsOptions = () => {
  return queryOptions({
    queryFn: () => getTags(),
    queryKey: ['tags'],
  })
}
