import { useMutation } from '@tanstack/react-query'
import type { MetadataResponse } from '@/types/api'
import { useScrapeData } from '@/utils/fetching/scrape'

export const useScrapeMutation = () => {
  const scrapeData = useScrapeData()

  return useMutation({
    mutationFn: async (url: string): Promise<MetadataResponse> => {
      const normalizedUrl = new URL(url).toString()
      return scrapeData(normalizedUrl)
    },
    mutationKey: ['scrape'],
  })
}
