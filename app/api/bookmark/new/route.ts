import { Bookmark } from '@/src/types/db';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { getScrapeData } from '@/src/utils/fetching/scrape';
import { getErrorMessage } from '@/src/utils/get-error-message';
import { matchTags } from '@/src/utils/matchTags';
import { createClient } from '@supabase/supabase-js';
import pMap from 'p-map';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestBody = await request.json();

  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.split(' ')[1];
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      bearerToken,
    );

    const dbMeta = await getDbMetadata(supabaseClient);
    const mapper = async ({
      scrape,
      url,
      ...rest
    }: Bookmark & { scrape: boolean }) => {
      // if there's a `scrape` query param, scrape the page and use the info
      if (url && scrape) {
        const metadata = await getScrapeData(url);
        console.log(`🚀 ~ POST ~ metadata:`, metadata);
        // TODO: get page content another way
        // const { isReaderable } = await readability(html)
        const tags = rest.tags || [];
        // scrape the url and use the result for the title and description
        return {
          ...rest,
          title: metadata.title,
          url: metadata.url,
          description: metadata.description,
          image: metadata.image,
          tags: [...matchTags(metadata, dbMeta.tags), ...tags],
          feed: metadata.feed,
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
      headers,
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
        headers,
      },
    );
  }
}

/*
import type { NextApiRequest, NextApiResponse } from 'next';
import pMap from 'p-map';

import { getMetaData } from '../../../server-utils';
import { Bookmark } from '../../../types/bookmark';
import {
  getErrorMessage,
  linkType,
  matchTags,
  setAuthHeaders,
  supabaseClient,
} from '../../../utils';
import { Database } from '@/src/types/supabase'

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method?.toLowerCase() === 'options') {
    return response.status(200).json({});
  }

  try {
    setAuthHeaders(request);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    return response.status(401).json({
      reason: 'Not authorised',
      error: errorMessage,
      data: null,
    });
  }

  switch (request.method) {
    // quick save bookmark
    case 'GET': {
      try {
        if (!request.query.url) {
          throw 'Please provide a url parameter';
        }
        const url = request.query.url as string;
        const dbMeta = await getDbMetadata();
        const metadata = await getMetaData(url);
        // TODO: get page content another way
        // const { isReaderable } = await readability(html)
        let urlType = 'link';
        try {
          urlType = linkType(metadata.url, false);
        } catch (err) {
          console.error('Problem fetching the link type');
        }
        const supabaseResponse = await supabaseClient
          .from<Bookmark[]>('bookmarks')
          .insert([
            // @ts-ignore
            {
              title: metadata.title,
              url: metadata.url,
              description: metadata.description,
              type: urlType,
              image: metadata.image,
              tags: matchTags(metadata, dbMeta.tags),
              feed: metadata.feed,
            },
          ]);

        if (supabaseResponse.error) {
          throw supabaseResponse.error;
        }
        return response.status(200).json(supabaseResponse.data);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        return response
          .status(400)
          .json({ reason: 'Problem adding new bookmark', error: errorMessage });
      }
    }
    case 'POST': {
      try {
        const mapper = async ({
          scrape,
          url,
          ...rest
        }: Bookmark & { scrape: boolean }) => {
          if (url) {
            // if there's a `scrape` query param, scrape the page and use the info
            if (scrape) {
              const dbMeta = await fetchDbMeta();
              const metadata = await getMetaData(url);
              // TODO: get page content another way
              // const { isReaderable } = await readability(html)
              let urlType = 'link';
              try {
                urlType = linkType(metadata.url, false);
              } catch (err) {
                console.error('Problem fetching the link type');
              }
              const tags = rest.tags || [];
              // scrape the url and use the result for the title and description
              return {
                ...rest,
                title: metadata.title,
                url: metadata.url,
                description: metadata.description,
                type: urlType,
                image: metadata.image,
                tags: [...matchTags(metadata, dbMeta.tags), ...tags],
                feed: metadata.feed,
              };
            }
            // if scrape disabled, use what is sent and add feed
            return {
              url,
              ...rest,
            };
          }
          // this is always used when no url is added
          return rest;
        };
        const payload = await pMap(request.body, mapper, { concurrency: 2 });
        const supabaseResponse = await supabaseClient
          .from<Bookmark[]>('bookmarks')
          .insert(payload as Bookmark[]);

        if (supabaseResponse.error) {
          throw supabaseResponse.error;
        }
        return response.status(200).json(supabaseResponse.data);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        return response.status(400).json({
          reason: 'Problem adding new bookmark',
          error: errorMessage,
          data: null,
        });
      }
    }
    default: {
      response.setHeader('Allow', ['GET', 'POST']);
      response.status(405).end(`Method ${request.method} Not Allowed`);
    }
  }
}*/
