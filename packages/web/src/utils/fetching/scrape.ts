import urlJoin from 'proper-url-join'
import type { MetadataResponse } from '@/types/api'

export const getScrapeData = async (url: string): Promise<MetadataResponse> => {
  const response = await fetch(
    urlJoin('/api/scrape', {
      query: { cleanUrl: 'true', url: url.toString() },
    }),
    { cache: 'force-cache' }
  )
  const data: MetadataResponse = await response.json()

  if (!data) {
    throw new Error('No metadata')
  }

  return data
}
