import { queryOptions, useQueryClient } from '@tanstack/react-query'
import urlJoin from 'proper-url-join'
import { useCallback } from 'react'
import type { MetadataResponse } from '@/types/api'

export const getScrapeData = async (url: string): Promise<MetadataResponse> => {
  const response = await fetch(
    urlJoin('/api/scrape', {
      query: { url: url.toString() },
    }),
    { cache: 'force-cache' },
  )
  const data: MetadataResponse = await response.json()

  if (!data) {
    throw new Error('No metadata')
  }

  return data
}

export const getScrapeDataOptions = (url: string) => {
  return queryOptions({
    queryFn: () => getScrapeData(url),
    queryKey: ['scrape', url],
    staleTime: 5 * 60 * 1000,
  })
}

export const useScrapeData = () => {
  const queryClient = useQueryClient()

  return useCallback(
    (url: string) => queryClient.fetchQuery(getScrapeDataOptions(url)),
    [queryClient],
  )
}
