import { MetadataResponse } from '@/src/types/api';
import urlJoin from 'proper-url-join';

export const getScrapeData = async (url: string): Promise<MetadataResponse> => {
  const response = await fetch(
    urlJoin('https://zm-scraper.zanderwtf.workers.dev/', {
      query: { url: url.toString(), cleanUrl: 'true' },
    }),
    { cache: 'force-cache' },
  );
  const data = await response.json();

  if (!data) {
    throw new Error('No metadata');
  }

  return data;
};
