import type { HonoRequest } from 'hono'
import { API_HEADERS } from '@/constants'
import type { MediaType } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'

export type MediaSearchItem = {
  id: string
  title: string
  image: string
  type: MediaType
  maker?: string
}

const getTvSearch = async (query: string): Promise<MediaSearchItem[]> => {
  try {
    const response = await fetch(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,
    )
    const data =
      await response.json<
        {
          show: {
            id: string
            image: { medium: string }
            name: string
            externals: {
              tvrage: string
              thetvdb: string
              imdb: string
            }
          }
        }[]
      >()
    return data?.map((item) => {
      return {
        id: item.show.externals.thetvdb,
        image: item.show?.image?.medium,
        title: item.show.name,
        type: 'tv',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

const bookCoverFallback = (title: string) =>
  `https://placehold.co/600x600?font=Poppins&text=${encodeURI(title)}`

export const getGoogleBooksSearch = async (
  query: string,
  apiKey: string,
): Promise<MediaSearchItem[]> => {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', query)
  url.searchParams.set('maxResults', '10')
  url.searchParams.set('printType', 'books')
  url.searchParams.set(
    'fields',
    'items(id,volumeInfo(title,authors,imageLinks))',
  )
  url.searchParams.set('key', apiKey)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Google Books search failed with status ${response.status}`)
  }
  const data = await response.json<{
    items?: {
      id: string
      volumeInfo?: {
        title?: string
        authors?: string[]
        imageLinks?: { thumbnail?: string; smallThumbnail?: string }
      }
    }[]
  }>()
  return (data?.items ?? []).flatMap((item) => {
    const title = item?.volumeInfo?.title
    if (!title) {
      return []
    }
    const thumbnail =
      item.volumeInfo?.imageLinks?.thumbnail ??
      item.volumeInfo?.imageLinks?.smallThumbnail
    return {
      id: item.id,
      // Google Books serves thumbnails over http by default
      image:
        thumbnail?.replace('http://', 'https://') ?? bookCoverFallback(title),
      maker: item.volumeInfo?.authors?.[0],
      title,
      type: 'book' as const,
    }
  })
}

export const getOpenLibrarySearch = async (
  query: string,
): Promise<MediaSearchItem[]> => {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(
      query,
    )}&limit=10&fields=key,cover_i,title,author_name,editions&lang=en`,
  )
  const data = await response.json<{
    docs: {
      key: string
      cover_i?: number
      editions?: { docs?: { cover_i?: number }[] }
      author_name?: string[]
      title: string
    }[]
  }>()
  return (
    data?.docs?.map((item) => {
      const coverId = item?.editions?.docs?.[0]?.cover_i ?? item?.cover_i
      return {
        id: item.key,
        image: coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : bookCoverFallback(item.title),
        maker: item?.author_name?.[0],
        title: item.title,
        type: 'book' as const,
      }
    }) ?? []
  )
}

/**
 * Book search uses Google Books when an API key is configured (best
 * relevance + cover images; keyless requests are heavily throttled from
 * datacenter IPs like Cloudflare Workers, hence the key requirement) and
 * falls back to Open Library otherwise.
 */
const getBookSearch = async (query: string): Promise<MediaSearchItem[]> => {
  const apiKey = import.meta.env.MEDIA_GOOGLE_BOOKS_API_KEY
  if (apiKey) {
    try {
      return await getGoogleBooksSearch(query, apiKey)
    } catch (err) {
      console.error(err)
    }
  }
  try {
    return await getOpenLibrarySearch(query)
  } catch (err) {
    console.error(err)
    return []
  }
}

const getGameSearch = async (query: string): Promise<MediaSearchItem[]> => {
  try {
    const response = await fetch(
      `https://api.gamebrain.co/v1/games?query=${encodeURIComponent(query)}&api-key=${
        import.meta.env.MEDIA_GAMEBRAIN_API_KEY
      }`,
    )
    const data = await response.json<{
      results: {
        id: string
        image: string
        name: string
      }[]
    }>()
    return data?.results?.map((item) => {
      return {
        id: item.id,
        image: item.image,
        title: item.name,
        type: 'game',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

const getPodcastSearch = async (query: string): Promise<MediaSearchItem[]> => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=podcast&limit=10`,
    )
    const data = await response.json<{
      results: {
        trackName: string
        artworkUrl600: string
        artistName: string
        name: string
        trackId: string
      }[]
    }>()
    return data?.results?.map((item) => {
      return {
        id: item.trackId,
        image: item.artworkUrl600,
        maker: item.artistName,
        title: item.trackName,
        type: 'podcast',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

export const getMediaSearch = async (
  request: HonoRequest<'/api/media-search'>,
) => {
  const searchParams = new URL(request.url).searchParams
  const type = searchParams.get('type')
  const query = searchParams.get('query')

  if (!type || !query) {
    return errorResponse({
      reason: 'Please provide `type` and `query` parameters',
      status: 400,
    })
  }

  let results: MediaSearchItem[] = []
  switch (type) {
    case 'tv':
      results = await getTvSearch(query)
      break
    case 'podcast':
      results = await getPodcastSearch(query)
      break
    case 'game':
      results = await getGameSearch(query)
      break
    case 'book':
      results = await getBookSearch(query)
      break
  }

  const response = {
    count: results.length,
    data: results,
  }

  return new Response(JSON.stringify(response), {
    headers: API_HEADERS,
    status: 200,
  })
}
