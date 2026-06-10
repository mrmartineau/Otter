import {
  DEFAULT_SYNC_LIMIT,
  type PlatformFetcher,
  type PlatformItemInput,
  requireCredential,
} from './types'

const PAGE_SIZE = 50

export interface YoutubeVideoView {
  id: string
  snippet?: {
    channelTitle?: string
    description?: string
    publishedAt?: string
    thumbnails?: Record<string, { url?: string }>
    title?: string
  }
}

export const mapYoutubeVideo = (video: YoutubeVideoView): PlatformItemInput => {
  const thumbnails = video.snippet?.thumbnails
  const image =
    thumbnails?.medium?.url ??
    thumbnails?.high?.url ??
    thumbnails?.default?.url ??
    null
  const description = video.snippet?.description?.trim() ?? ''

  return {
    createdAt: video.snippet?.publishedAt
      ? new Date(video.snippet.publishedAt)
      : undefined,
    description: description
      ? description.length > 500
        ? `${description.slice(0, 500)}…`
        : description
      : null,
    externalId: video.id,
    image,
    metadata: { channelTitle: video.snippet?.channelTitle ?? null },
    title: video.snippet?.title ?? 'YouTube video',
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }
}

const getAccessToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string,
) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`YouTube token refresh failed (${response.status})`)
  }

  const body = (await response.json()) as { access_token?: string }

  if (!body.access_token) {
    throw new Error('YouTube token refresh returned no access token')
  }

  return body.access_token
}

export const fetchYoutubeLikes: PlatformFetcher = async ({
  credentials,
  limit = DEFAULT_SYNC_LIMIT,
}) => {
  const clientId = requireCredential(credentials, 'clientId', 'YouTube')
  const clientSecret = requireCredential(credentials, 'clientSecret', 'YouTube')
  const refreshToken = requireCredential(credentials, 'refreshToken', 'YouTube')
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken)
  const items: PlatformItemInput[] = []
  let pageToken: string | undefined

  while (items.length < limit) {
    const params = new URLSearchParams({
      maxResults: String(PAGE_SIZE),
      myRating: 'like',
      part: 'snippet',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error(
        `YouTube liked videos request failed (${response.status})`,
      )
    }

    const body = (await response.json()) as {
      items?: YoutubeVideoView[]
      nextPageToken?: string
    }
    const videos = body.items ?? []

    items.push(...videos.map(mapYoutubeVideo))

    if (!body.nextPageToken || videos.length === 0) {
      break
    }

    pageToken = body.nextPageToken
  }

  return items.slice(0, limit)
}
