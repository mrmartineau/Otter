import { env } from 'cloudflare:workers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getUserProfileByApiKey } from '@/utils/fetching/user'
import { supabaseUrl } from '@/utils/supabase/client'
import type {
  YouTubePlaylistItem,
  YouTubePlaylistItemsResponse,
  YouTubeTokenResponse,
} from './types'

const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const MAX_RESULTS_PER_PAGE = 50
const MAX_PAGES = 10
const DESCRIPTION_MAX_LENGTH = 500

const SKIPPED_TITLES = new Set(['Private video', 'Deleted video'])

async function getAccessToken(): Promise<string> {
  // @ts-expect-error - env typing
  const clientId = env.YOUTUBE_CLIENT_ID
  // @ts-expect-error - env typing
  const clientSecret = env.YOUTUBE_CLIENT_SECRET
  // @ts-expect-error - env typing
  const refreshToken = env.YOUTUBE_REFRESH_TOKEN

  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `Failed to exchange refresh token (${response.status}): ${error}. ` +
        'If the token expired, re-authorize and update the YOUTUBE_REFRESH_TOKEN secret.',
    )
  }

  const data = (await response.json()) as YouTubeTokenResponse
  return data.access_token
}

async function fetchLikedVideosPage(
  accessToken: string,
  pageToken?: string,
): Promise<YouTubePlaylistItemsResponse> {
  const params = new URLSearchParams({
    playlistId: 'LL',
    part: 'snippet',
    maxResults: String(MAX_RESULTS_PER_PAGE),
  })
  if (pageToken) {
    params.set('pageToken', pageToken)
  }

  const response = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `YouTube API error (${response.status}): ${error}`,
    )
  }

  return (await response.json()) as YouTubePlaylistItemsResponse
}

function getBestThumbnail(
  thumbnails: YouTubePlaylistItem['snippet']['thumbnails'],
): string | null {
  const preferred = thumbnails.maxres ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default
  return preferred?.url ?? null
}

function buildCanonicalUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

function isValidItem(item: YouTubePlaylistItem): boolean {
  if (!item.snippet?.resourceId?.videoId) return false
  if (SKIPPED_TITLES.has(item.snippet.title)) return false
  return true
}

export async function fetchAndStoreYouTubeLikes(): Promise<void> {
  // @ts-expect-error - env typing
  const apiKey = env.OTTER_API_KEY
  // @ts-expect-error - env typing
  const serviceKey = env.SUPABASE_SERVICE_KEY

  // Check required secrets
  const missing = []
  // @ts-expect-error - env typing
  if (!env.YOUTUBE_CLIENT_ID) missing.push('YOUTUBE_CLIENT_ID')
  // @ts-expect-error - env typing
  if (!env.YOUTUBE_CLIENT_SECRET) missing.push('YOUTUBE_CLIENT_SECRET')
  // @ts-expect-error - env typing
  if (!env.YOUTUBE_REFRESH_TOKEN) missing.push('YOUTUBE_REFRESH_TOKEN')
  if (!apiKey) missing.push('OTTER_API_KEY')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_KEY')

  if (missing.length > 0) {
    console.error(`YouTube likes sync: missing secrets: ${missing.join(', ')}`)
    return
  }

  const client = createClient<Database>(supabaseUrl, serviceKey)
  const { data: user } = await getUserProfileByApiKey(apiKey, client)

  if (!user) {
    console.error('YouTube likes sync: could not resolve user from OTTER_API_KEY')
    return
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken()
  } catch (error) {
    console.error('YouTube likes sync: failed to get access token:', error)
    return
  }

  let totalInserted = 0
  let pageToken: string | undefined
  let page = 0

  while (page < MAX_PAGES) {
    page++

    let response: YouTubePlaylistItemsResponse
    try {
      response = await fetchLikedVideosPage(accessToken, pageToken)
    } catch (error) {
      console.error(`YouTube likes sync: API error on page ${page}:`, error)
      break
    }

    const validItems = response.items.filter(isValidItem)
    if (validItems.length === 0) break

    // Build canonical URLs for deduplication
    const urls = validItems.map((item) =>
      buildCanonicalUrl(item.snippet.resourceId.videoId),
    )

    // Check which URLs already exist
    const { data: existingBookmarks } = await client
      .from('bookmarks')
      .select('url')
      .in('url', urls)

    const existingUrls = new Set(
      existingBookmarks?.map((b) => b.url) ?? [],
    )

    // Filter to only new items
    const newItems = validItems.filter(
      (item) =>
        !existingUrls.has(
          buildCanonicalUrl(item.snippet.resourceId.videoId),
        ),
    )

    // If we found existing items, we've caught up — insert new ones and stop
    const hitExisting = newItems.length < validItems.length

    if (newItems.length > 0) {
      const bookmarks = newItems.map((item) => {
        const description = item.snippet.description
          ? item.snippet.description.slice(0, DESCRIPTION_MAX_LENGTH)
          : null

        return {
          url: buildCanonicalUrl(item.snippet.resourceId.videoId),
          title: item.snippet.title,
          description,
          image: getBestThumbnail(item.snippet.thumbnails),
          type: 'video' as const,
          star: false,
          status: 'active' as const,
          tags: ['like:youtube'],
          user: user.id,
        }
      })

      const { error, data } = await client
        .from('bookmarks')
        .insert(bookmarks)
        .select('id')

      if (error) {
        console.error('YouTube likes sync: insert error:', error)
      } else {
        totalInserted += data.length
      }
    }

    if (hitExisting || !response.nextPageToken) break
    pageToken = response.nextPageToken
  }

  console.log(
    `YouTube likes sync complete: inserted ${totalInserted} new bookmarks (scanned ${page} page(s))`,
  )
}
