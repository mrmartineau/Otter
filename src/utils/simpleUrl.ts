import memoizeOne from 'memoize-one';

export const simpleUrlSource = (url: string, withPath?: boolean): string => {
  const urlString = url;
  try {
    if ('URL' in window) {
      const urlObject = new URL(url);
      const hostname = urlObject.hostname.replace('www.', '');
      if (withPath) {
        return hostname + urlObject.pathname;
      }
      return hostname;
    }
    return urlString;
  } catch (err) {
    return urlString;
  }
};

export const simpleUrl = memoizeOne(simpleUrlSource);
