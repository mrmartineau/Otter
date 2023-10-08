'use client';

import { LinkSimpleHorizontal, PlusCircle } from '@phosphor-icons/react';
import urlJoin from 'proper-url-join';

import { ROUTE_NEW_BOOKMARK } from '../constants';
import { Toot, TootUrls } from '../types/db';
import { Favicon } from './Favicon';
import './Feed.styles.css';
import { Flex } from './Flex';
import { headingVariants } from './Heading';
import { Link } from './Link';
import { Markdown } from './Markdown';
import './TootFeedItem.css';

export const TootFeedItem = (props: Toot) => {
  const { text, user_avatar, user_id, user_name, urls, toot_url, media } =
    props;
  const tootUrls = (urls as TootUrls).filter((item) => {
    const isHashTag = item.href.includes('/tags/');
    const isDodgyLink = item.href.includes('</span>');
    const isMention = item.href.includes('/@');
    if (isHashTag || isDodgyLink || isMention) return false;
    return true;
  });
  const tootMedia = media as any[];

  return (
    <div className="feed-wrapper">
      <div className="flex items-center gap-xs">
        {user_avatar ? (
          <img src={user_avatar} alt="" className="feed-avatar" />
        ) : null}
        <Flex direction="column">
          <div className="text-step--1">{user_name}</div>
          <div className="text-step--2">@{user_id}</div>
        </Flex>
      </div>
      {text ? <Markdown>{text}</Markdown> : null}

      {toot_url ? (
        <div>
          <Link
            rel="external"
            href={toot_url}
            className="flex gap-2xs items-center text-step--1"
          >
            <LinkSimpleHorizontal weight="duotone" size="14" /> Toot
          </Link>
        </div>
      ) : null}

      {tootUrls?.length ? (
        <div>
          <h3 className={headingVariants({ variant: 'date' })}>URLs</h3>
          <ul className="flex flex-col gap-2xs">
            {tootUrls.map((item) => {
              return (
                <li
                  key={item.href}
                  className="flex items-center flex-wrap gap-2xs text-step--1"
                >
                  <Link
                    href={urlJoin(ROUTE_NEW_BOOKMARK, {
                      query: {
                        url: item.href,
                      },
                    })}
                    variant="add"
                  >
                    <PlusCircle weight="duotone" size={14} /> Add
                  </Link>
                  <Favicon url={item.href} />
                  <Link href={item.href} className="break-all">
                    {item.href}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tootMedia?.length ? (
        <div className="toot-media-grid">
          {tootMedia.map((item) => {
            const isVideoType = item.type === 'gifv' || item.type === 'video';
            const isPhotoType = item.type === 'image';
            return (
              <div key={item.id}>
                {isVideoType ? (
                  <video src={item.url} controls className="max-w-full" />
                ) : isPhotoType ? (
                  <img
                    src={item.url}
                    alt={item?.description}
                    className="max-w-full rounded-m"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
