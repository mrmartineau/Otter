import urlJoin from 'proper-url-join';

export const fullPath = (url: string, suffix: string) => {
  const domain = url ? new URL(url).origin : null;
  return suffix?.charAt(0) === '/' && domain ? urlJoin(domain, suffix) : suffix;
};
