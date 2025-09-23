import { queryOptions } from '@tanstack/react-query'
import urlJoin from 'proper-url-join'
import type { Feed } from 'worker/rss/rss-to-json'

export const getRss = async (url: string) => {
  const response = await fetch(
    urlJoin('/api/rss', {
      query: { feed: url },
    }),
  )
  const data: Feed = await response.json()

  if (!data) {
    throw new Error('No metadata')
  }

  return data
}

export const getRssOptions = (url: string) => {
  return queryOptions({
    queryFn: () => getRss(url),
    queryKey: ['rss', url],
  })
}
