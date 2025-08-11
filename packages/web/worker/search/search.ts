import type { HonoRequest } from 'hono'
import { API_HEADERS } from '@/constants'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getSearchBookmarks } from '@/utils/fetching/search'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { createAuthenticatedClient } from '../supabase/client'

/**
 * /api/search/url=https://example.com
 * This endpoint searches bookmarks and tweets
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export const getSearch = async (request: HonoRequest<'/api/search'>) => {
  try {
    const { q, ...searchParams } = searchParamsToObject(request.url)
    // @ts-expect-error - TODO: fix this
    const { client, user } = await createAuthenticatedClient(request)
    const { data, count, error } = await getSearchBookmarks({
      params: searchParams,
      searchTerm: q,
      supabaseClient: client,
      userId: user.id,
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: count ?? 0,
          data: data || [],
          limit: Number(searchParams.limit),
          offset: Number(searchParams.offset),
          path: request.url as string,
        })
      ),
      {
        headers: API_HEADERS,
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return errorResponse({
      error: errorMessage,
      reason: 'Problem searching bookmarks',
      status: 400,
    })
  }
}
