import { API_HEADERS } from '@/src/constants';
import { apiResponseGenerator } from '@/src/utils/fetching/apiResponse';
import { errorResponse } from '@/src/utils/fetching/errorResponse';
import {
  getSearchBookmarks,
  getSearchTweets,
} from '@/src/utils/fetching/search';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { searchParamsToObject } from '@/src/utils/searchParamsToObject';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

/**
 * /api/search/url=https://example.com
 * This endpoint searches bookmarks and tweets
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export async function GET(request: Request) {
  try {
    const { searchTerm, ...searchParams } = searchParamsToObject(request.url);
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.split(' ')[1];
    const supabaseClient = createClient(
      // @ts-ignore
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      bearerToken,
    );

    const { data, count, error } = await getSearchBookmarks({
      supabaseClient,
      params: searchParams,
      searchTerm,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          data: data || [],
          limit: Number(searchParams.limit),
          offset: Number(searchParams.offset),
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
    return errorResponse({
      reason: 'Problem searching bookmarks',
      error: errorMessage,
      status: 400,
    });
  }
}
