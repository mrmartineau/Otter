import { API_HEADERS } from '@/src/constants';
import { apiResponseGenerator } from '@/src/utils/fetching/apiResponse';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { searchParamsToObject } from '@/src/utils/searchParamsToObject';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const searchParams = searchParamsToObject(request.url);
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.split(' ')[1];
    const supabaseClient = createClient(
      // @ts-ignore
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      bearerToken,
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
    return new Response(
      JSON.stringify({
        reason: 'Problem adding new bookmark',
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
