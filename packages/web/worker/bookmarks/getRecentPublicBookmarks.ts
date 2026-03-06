import { env } from 'cloudflare:workers'
import { createClient } from '@supabase/supabase-js'
import type { HonoRequest } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Database } from '@/types/supabase'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { supabaseUrl } from '@/utils/supabase/client'

/**
 * GET /api/recent
 * Returns the most recent public bookmarks from all users.
 * No authentication required.
 */
export const getRecentPublicBookmarks = async (
  request: HonoRequest<'/api/recent'>,
) => {
  try {
    const searchParams = searchParamsToObject(request.url)
    const limit = Number(searchParams.limit) || DEFAULT_API_RESPONSE_LIMIT
    const offset = Number(searchParams.offset) || 0

    // @ts-expect-error - TODO: fix this
    const client = createClient<Database>(supabaseUrl, env.SUPABASE_SERVICE_KEY)

    const { data, count, error } = await client
      .from('bookmarks')
      .select('*', { count: 'exact' })
      .match({ public: true, status: 'active' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: count ?? 0,
          data: data || [],
          limit,
          offset,
          path: request.url as string,
        }),
      ),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem getting recent public bookmarks',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}
