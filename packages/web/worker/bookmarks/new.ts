import type { HonoRequest } from 'hono'
import pMap from 'p-map'
import { API_HEADERS } from '@/constants'
import type { Bookmark } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getDbMetadata } from '@/utils/fetching/meta'
import { getScrapeData } from '@/utils/fetching/scrape'
import { getErrorMessage } from '@/utils/get-error-message'
import { matchTags } from '@/utils/matchTags'
import { createAuthenticatedClient } from '../supabase/client'

/**
 * POST /api/new This endpoint adds new bookmarks It uses the Supabase service
 * key environment variable to authenticate but there needs to be a matching
 * user with an API key in the profiles table
 */
export const postNewBookmark = async (request: HonoRequest<'/api/new'>) => {
  const requestBody = await request.json()

  try {
    // @ts-expect-error - TODO: fix this
    const { client, user } = await createAuthenticatedClient(request)
    const dbMeta = await getDbMetadata(client)
    const mapper = async ({
      scrape,
      url,
      ...rest
    }: Bookmark & { scrape: boolean }) => {
      // if there are `scrape` & `url` query params, scrape the page and use the info
      if (url && scrape) {
        const metadata = await getScrapeData(url)
        const tags = rest.tags || []
        // scrape the url and use the result for the title and description
        return {
          ...rest,
          description: metadata.description,
          feed: metadata.feeds,
          image: metadata.image,
          tags: [...matchTags(metadata, dbMeta.tags), ...tags],
          title: metadata.title,
          type: metadata.urlType,
          url: metadata.cleaned_url || metadata.url,
          user: user.id,
        }
      }

      return { url, ...rest, user: user.id }
    }
    const payload = await pMap(requestBody, mapper, { concurrency: 2 })
    console.log(`🚀 ~ postNewBookmark ~ payload:`, payload)
    const supabaseResponse = await client
      .from('bookmarks')
      .insert(payload)
      .select()

    if (supabaseResponse.error) {
      throw supabaseResponse.error
    }

    return new Response(JSON.stringify(supabaseResponse.data), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem adding new bookmark',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      }
    )
  }
}

/**
 * GET /api/new?url=https://example.com
 * This endpoint adds new bookmarks
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export const getNewBookmark = async (request: HonoRequest<'/api/new'>) => {
  const searchParams = new URL(request.url).searchParams
  const url = searchParams.get('url')

  if (!url) {
    return errorResponse({
      reason: 'Please provide a url parameter',
      status: 400,
    })
  }

  try {
    // @ts-expect-error - TODO: fix this
    const { client, user } = await createAuthenticatedClient(request)

    const dbMeta = await getDbMetadata()
    const metadata = await getScrapeData(url)
    const supabaseResponse = await client
      .from('bookmarks')
      .insert([
        {
          description: metadata.description,
          feed: metadata.feeds,
          image: metadata.image,
          tags: matchTags(metadata, dbMeta.tags),
          title: metadata.title,
          type: metadata.urlType,
          url: metadata.cleaned_url || metadata.url,
          user: user.id,
        },
      ])
      .select()

    if (supabaseResponse.error) {
      throw supabaseResponse.error
    }

    return new Response(JSON.stringify(supabaseResponse.data), {
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return errorResponse({
      error: errorMessage,
      reason: 'Problem adding new bookmark',
      status: 400,
    })
  }
}
