import { API_HEADERS } from '@/src/constants';
import { errorResponse } from '@/src/utils/fetching/errorResponse';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { toJson } from 'rss-converter';

/**
 * /api/rss
 * This endpoint converts an RSS feed to JSON
 * It uses the `OTTER_API_TOKEN` environment variable to authenticate via an Authorization header token
 */
export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabaseClient = createRouteHandlerClient({
    cookies: () => cookieStore,
  });
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  let isAuthorised =
    session ||
    request.headers.get('Authorization') !== process.env.OTTER_API_TOKEN;

  if (!isAuthorised) {
    return errorResponse({ reason: 'Not authorised', status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const feedUrl = searchParams.get('feed');
  const limit = searchParams.get('limit') || 20;

  if (!feedUrl) {
    return errorResponse({
      reason: 'No `url` query-string parameter',
      error: 'You must provide a `url` query-string parameter',
      status: 400,
    });
  }

  try {
    const feed = await toJson(feedUrl);
    const feedItems = feed.items
      .slice(0, limit)
      // eslint-disable-next-line
      // @ts-ignore
      .map(({ content_encoded, content, category, comments, ...rest }) => {
        return rest;
      });
    return new Response(
      JSON.stringify({
        ...feed,
        items: feedItems,
      }),
      {
        status: 400,
        headers: API_HEADERS,
      },
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return errorResponse({
      reason: 'Problem fetching the RSS feed',
      error: errorMessage,
      status: 400,
    });
  }
}
