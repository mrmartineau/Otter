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
        event.currentTarget.src = '/otter-logo.svg';
      }}
    />
  );
};
