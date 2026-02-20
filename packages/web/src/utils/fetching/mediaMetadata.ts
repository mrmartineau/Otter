import { queryOptions } from '@tanstack/react-query'
import type { MediaType } from '@/types/db'

type MediaMetadataItem = {
  id: string
  title: string
  image: string
  type: MediaType
}

const getTvMetadata = async (query: string): Promise<MediaMetadataItem[]> => {
  try {
    const response = await fetch(
      `https://api.tvmaze.com/search/shows?q=${query}`,
    )
    const data = (await response.json()) as {
      id: string
      image: { medium: string }
      name: string
    }[]
    return data?.map((item) => {
      return {
        id: item.id,
        image: item.image.medium,
        title: item.name,
        type: 'tv',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

const getBookMetadata = async (query: string) => {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?title=${query}&_spellcheck_count=0&limit=10&fields=key,cover_i,title,subtitle,author_name,editions,name&mode=everything`,
    )
    const data = (await response.json()) as {
      docs: {
        id: string
        editions: { cover_i: string }[]
        title: string
        subtitle: string
        author_name: string
        name: string
      }[]
    }
    return data?.docs?.map((item) => {
      return {
        id: item.id,
        // image: `https://covers.openlibrary.org/b/isbn/9780241636602-L.jpg`,
        image: `https://covers.openlibrary.org/b/id/${item.editions[0].cover_i}-M.jpg?default=https://openlibrary.org/static/images/icons/avatar_book-sm.png`,
        title: item.title,
        type: 'book',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

const getGameMetadata = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.gamebrain.co/v1/games?query=${query}&api-key=${
        import.meta.env.MEDIA_GAMEBRAIN_API_KEY
      }`,
    )
    const data = (await response.json()) as {
      results: { id: string; image: string; name: string }[]
    }
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

const getPodcastMetadata = async (query: string) => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=podcast&limit=10`,
    )
    const data = (await response.json()) as {
      results: { trackName: string; artworkUrl600: string; name: string }[]
    }
    return data?.results?.map((item) => {
      return {
        id: item.trackName,
        image: item.artworkUrl600,
        title: item.name,
        type: 'podcast',
      }
    })
  } catch (err) {
    console.error(err)
    return []
  }
}

export const getMediaMetadata = async ({
  type,
  query,
}: MediaMetadataFetchingOptions) => {
  if (!query) {
    return []
  }

  switch (type) {
    case 'tv':
      return await getTvMetadata(query)
    case 'podcast':
      return await getPodcastMetadata(query)
    case 'game':
      return await getGameMetadata(query)
    case 'book':
      return await getBookMetadata(query)
  }
}

interface MediaMetadataFetchingOptions {
  type: MediaType
  query: string
}

export const getMediaMetadataOptions = ({
  type,
  query,
}: MediaMetadataFetchingOptions) => {
  return queryOptions({
    queryFn: () => getMediaMetadata({ query, type }),
    queryKey: ['media', type, query],
    staleTime: 5 * 1000,
  })
}
