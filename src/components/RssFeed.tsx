import urlJoin from 'proper-url-join';
import { useEffect, useState } from 'react';

import { API_RSS, CONTENT } from '../constants';
import { headingVariants } from './Heading';
import { Link } from './Link';

export interface FeedResponse {
  title: string;
  atom_link: AtomLink;
  link: string;
  description: string;
  lastBuildDate: string;
  language: string;
  sy_updatePeriod: string;
  sy_updateFrequency: string;
  image: Image;
  items: Item[];
}

export interface AtomLink {
  _attrs: Attrs;
}

export interface Attrs {
  href: string;
  rel: string;
  type: string;
}

export interface Image {
  url: string;
  title: string;
  link: string;
  width: string;
  height: string;
}

export interface Item {
  title: string;
  link: string;
  dc_creator: string;
  pubDate: string;
  category: string[];
  guid: string;
  description: string;
  content_encoded: string;
  guid_isPermaLink: string;
  comments?: string;
  wfw_commentRss?: string;
  slash_comments?: string;
}

interface RssFeedProps {
  feedUrl: string;
}
export const RssFeed = ({ feedUrl }: RssFeedProps) => {
  const [feed, setFeed] = useState<FeedResponse>();

  useEffect(() => {
    const fetchFeed = async () => {
      const response = await fetch(
        urlJoin(API_RSS, {
          query: {
            feed: feedUrl,
            limit: 5,
          },
        }),
      );
      const data = await response.json();

      if (!data) {
        throw new Error('No data');
      }

      setFeed(data);
    };
    fetchFeed();
  }, [feedUrl]);

  return (
    <>
      <h5 className={headingVariants({ variant: 'date' })}>
        {CONTENT.latestRssItems}
      </h5>
      <ol className="max-w-260 mb-0 list-inside list-decimal pl-0">
        {feed?.items.map(({ link, title, guid }) => (
          <li key={guid}>
            <Link href={link} className="!inline">
              {title}
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
};
