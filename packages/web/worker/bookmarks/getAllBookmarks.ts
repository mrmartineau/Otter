import type { Env, HonoRequest } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { getBookmarks } from '@/utils/fetching/bookmarks'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { createAuthenticatedClient } from '../supabase/client'

/**
 * POST /api/bookmarks
 * This endpoint gets bookmarks
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export const getAllBookmarks = async (
  request: HonoRequest<'/api/bookmarks'>
) => {
  try {
    const searchParams = searchParamsToObject(request.url)
    // @ts-expect-error - TODO: fix this
    const { client, user } = await createAuthenticatedClient(request)
    const { data, count, error } = await getBookmarks(
      searchParams,
      client,
      user.id
    )

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: count ?? 0,
          data: data || [],
          limit: Number(searchParams.limit) || DEFAULT_API_RESPONSE_LIMIT,
          offset: Number(searchParams.offset) || 0,
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
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem getting bookmarks',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      }
    )
  }
}
