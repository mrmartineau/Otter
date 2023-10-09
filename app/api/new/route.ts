import { API_HEADERS } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { errorResponse } from '@/src/utils/fetching/errorResponse';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { getScrapeData } from '@/src/utils/fetching/scrape';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { matchTags } from '@/src/utils/matchTags';
import { createClient } from '@supabase/supabase-js';
import pMap from 'p-map';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST /api/new
 * This endpoint adds new bookmarks
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export async function POST(request: Request) {
  const requestBody = await request.json();

  try {
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.split(' ')[1];
    const supabaseClient = createClient(
      // @ts-ignore
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      bearerToken,
    );

    const dbMeta = await getDbMetadata(supabaseClient);
    const mapper = async ({
      scrape,
      url,
      ...rest
    }: Bookmark & { scrape: boolean }) => {
      // if there are `scrape` & `url` query params, scrape the page and use the info
      if (url && scrape) {
        const metadata = await getScrapeData(url);
        const tags = rest.tags || [];
        // scrape the url and use the result for the title and description
        return {
          ...rest,
          title: metadata.title,
          description: metadata.description,
          image: metadata.image,
          url: metadata.cleaned_url || metadata.url,
          type: metadata.urlType,
          feed: metadata.feeds,
          tags: [...matchTags(metadata, dbMeta.tags), ...tags],
        };
      }

      return { url, ...rest };
    };
    const payload = await pMap(requestBody, mapper, { concurrency: 2 });
    const supabaseResponse = await supabaseClient
      .from('bookmarks')
      .insert(payload)
      .select();

    if (supabaseResponse.error) {
      throw supabaseResponse.error;
    }

    return new Response(JSON.stringify(supabaseResponse.data), {
      status: 200,
      headers: API_HEADERS,
    });
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

/**
 * GET /api/new?url=https://example.com
 * This endpoint adds new bookmarks
 * It uses the Supabase service key environment variable to authenticate via an Authorization header (Bearer token)
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return errorResponse({
      reason: 'Please provide a url parameter',
      status: 400,
    });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.split(' ')[1];
    const supabaseClient = createClient(
      // @ts-ignore
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      bearerToken,
    );

    const dbMeta = await getDbMetadata(supabaseClient);
    const metadata = await getScrapeData(url);
    const supabaseResponse = await supabaseClient
      .from('bookmarks')
      .insert([
        // @ts-ignore
        {
          title: metadata.title,
          description: metadata.description,
          image: metadata.image,
          url: metadata.cleaned_url || metadata.url,
          type: metadata.urlType,
          feed: metadata.feeds,
          tags: matchTags(metadata, dbMeta.tags),
        },
      ])
      .select();

    if (supabaseResponse.error) {
      throw supabaseResponse.error;
    }

    return new Response(JSON.stringify(supabaseResponse.data), {
      status: 200,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return errorResponse({
      reason: 'Problem adding new bookmark',
      error: errorMessage,
      status: 400,
    });
  }
}
