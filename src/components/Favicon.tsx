import { simpleUrl } from '@/src/utils/simpleUrl';

interface FaviconProps {
  url: string;
}

export const Favicon = ({ url }: FaviconProps) => {
  const urlDomain = simpleUrl(url);
  // let favicon = `https://icons.duckduckgo.com/ip3/${urlDomain}.ico`
  // let favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlDomain}&sz=128`
  let favicon = `https://logo.clearbit.com/${urlDomain}`;
  switch (urlDomain) {
    case 'producthunt.com':
      favicon = 'https://ph-static.imgix.net/ph-favicon.ico';
      break;
  }
  return (
    <img
      src={favicon}
      alt=""
      width="20"
      height="20"
      loading="lazy"
      className="block shrink-0 overflow-hidden rounded-full"
      onError={(event) => {
        event.currentTarget.onerror = null; // prevents looping
        event.currentTarget.src =
          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ctext%20y%3D%22.9em%22%20font-size%3D%2290%22%3E%F0%9F%A6%A6%3C%2Ftext%3E%3C%2Fsvg%3E';
      }}
    />
  );
};
