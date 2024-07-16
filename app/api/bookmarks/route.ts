import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/src/constants';
import { apiResponseGenerator } from '@/src/utils/fetching/apiResponse';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { searchParamsToObject } from '@/src/utils/searchParamsToObject';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

/**
 * POST /api/bookmarks
 * This endpoint gets bookmarks
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export async function GET(request: Request) {
  try {
    const searchParams = searchParamsToObject(request.url);
    const authHeader = request.headers.get('Authorization');
    const supabaseClient = createClient(
      // @ts-ignore
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const { data, count, error } = await getBookmarks({
      supabaseClient,
      params: searchParams,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          data: data || [],
          limit: Number(searchParams.limit) || DEFAULT_API_RESPONSE_LIMIT,
          offset: Number(searchParams.offset) || 0,
          count: count ?? 0,
          path: request.url as string,
        }),
      ),
      {
        status: 200,
        headers: API_HEADERS,
      },
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return new Response(
      JSON.stringify({
        reason: 'Problem fetching bookmarks',
        error: errorMessage,
        data: null,
      }),
      {
        status: 400,
        headers: API_HEADERS,
      },
    );
  }
}
