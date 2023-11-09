'use client';

import { Note, TwitterLogo } from '@phosphor-icons/react';

import { useClickBookmark } from '../hooks/useClickBookmark';
import { Bookmark } from '../types/db';
import { fullPath } from '../utils/fullPath';
import './Feed.css';
import { FeedItemFooter } from './FeedItemFooter';
import { Flex } from './Flex';
import { Link } from './Link';
import { Markdown } from './Markdown';

export interface BookmarkFeedItemProps extends Bookmark {
  allowDeletion?: boolean;
}

export const BookmarkFeedItem = (props: BookmarkFeedItemProps) => {
  const { title, url, description, note, id, tweet, image } = props;
  const handleClickRegister = useClickBookmark();

  return (
    <div className="feed-item">
      <div className="feed-item-cols">
        <div className="feed-item-content">
          {url && title ? (
            <div>
              <Link
                href={url}
                variant="feedTitle"
                onClick={() => handleClickRegister(id)}
              >
                {title}
              </Link>
            </div>
          ) : title ? (
            <div>{title}</div>
          ) : null}
          {description ? <Markdown>{description}</Markdown> : null}
          {note ? (
            <div className="feed-item-note">
              <Flex
                gap="2xs"
                align="center"
                className="mb-s border-b-2 border-solid border-theme7 pb-3xs text-step--1"
              >
                <Note
                  aria-label="Note"
                  weight="duotone"
                  size={20}
                  className="shrink-0 text-theme10"
                />
                Note
              </Flex>
              <Markdown>{note}</Markdown>
            </div>
          ) : null}
          {tweet?.text ? (
            <Flex gap="2xs">
              <div className="shrink-0 text-theme10">
                <TwitterLogo size={18} weight="duotone" />
              </div>
              <div className="shrink-0 text-step--1 tracking-tight">
                <Link href={tweet.url}>@{tweet.username}</Link>
                <Markdown>{tweet.text}</Markdown>
              </div>
            </Flex>
          ) : null}
        </div>
        {image && url ? (
          <div>
            <img src={fullPath(url, image)} alt="" className="feed-image" />
          </div>
        ) : null}
      </div>
      <FeedItemFooter {...props} key={`footer-${id}`} />
    </div>
  );
};
