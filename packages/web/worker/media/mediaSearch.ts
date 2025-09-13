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
      `https://api.tvmaze.com/search/shows?q=${query}`
    )
    const data = await response.json<
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

const getBookSearch = async (query: string): Promise<MediaSearchItem[]> => {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=10&fields=key,cover_i,title,subtitle,author_name,editions,name&mode=everything&lang=en&sort=new`
    )
    const data = await response.json<{
      docs: {
        cover_i: string
        editions: { cover_i: string }[]
        author_name: string[]
        title: string
      }[]
    }>()
    return data?.docs?.map((item) => {
      const image = item?.cover_i
        ? `https://covers.openlibrary.org/b/id/${item?.cover_i}-M.jpg`
        : `https://placehold.co/600x600?font=Poppins&text=${encodeURI(
            item.title
          )}`
      return {
        id: item?.cover_i,
        image,
        maker: item?.author_name?.[0],
        title: item.title,
        type: 'book',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

const getGameSearch = async (query: string): Promise<MediaSearchItem[]> => {
  try {
    const response = await fetch(
      `https://api.gamebrain.co/v1/games?query=${query}&api-key=${process.env.MEDIA_GAMEBRAIN_API_KEY}`
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
      `https://itunes.apple.com/search?term=${query}&entity=podcast&limit=10`
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
  request: HonoRequest<'/api/media-search'>
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
