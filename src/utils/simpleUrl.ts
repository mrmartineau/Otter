import memoizeOne from 'memoize-one';
import tldjs from 'tldjs';

export const simpleUrlSource = (url: string): string => {
  const parsedUrl = tldjs.parse(url);
  return parsedUrl.hostname?.replace('www.', '') || url;
};

export const simpleUrl = memoizeOne(simpleUrlSource);
