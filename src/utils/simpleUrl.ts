import memoizeOne from 'memoize-one';

export const simpleUrl = memoizeOne(
  (url: string, withPath?: boolean): string => {
    const newUrl = new URL(url);
    const hostname = newUrl.hostname?.replace('www.', '');
    return withPath ? `${hostname}${newUrl.pathname}` : hostname;
  },
);
