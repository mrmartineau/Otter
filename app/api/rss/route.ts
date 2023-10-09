import { API_HEADERS } from '@/src/constants';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { toJson } from 'rss-converter';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const feedUrl = searchParams.get('feed');
  const limit = searchParams.get('limit') || 20;

  if (!feedUrl) {
    return new Response(
      JSON.stringify({
        reason: 'No `url` query-string parameter',
        error: 'You must provide a `url` query-string parameter',
        data: null,
      }),
      {
        status: 400,
        headers: API_HEADERS,
      },
    );
  }

  try {
    const feed = await toJson(feedUrl);
    const feedItems = feed.items
      .slice(0, limit)
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    return new Response(
      JSON.stringify({
        reason: 'Problem fetching the RSS feed',
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
