import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/Tooltip';
import { MINIMUM_CLICK_COUNT } from '@/src/constants';
import {
  Calendar,
  Cards,
  Eye,
  Hash,
  NavigationArrow,
  RssSimple,
  Star,
} from '@phosphor-icons/react';
import urlJoin from 'proper-url-join';
import { Suspense, useEffect, useMemo } from 'react';
import title from 'title';
import { i } from 'vitest/dist/reporters-1evA5lom';

import { useClickBookmark } from '../hooks/useClickBookmark';
import { Bookmark } from '../types/db';
import { getRelativeDate } from '../utils/dates';
import { findMatchingCollections } from '../utils/findMatchingCollections';
import { fullPath } from '../utils/fullPath';
import { simpleUrl } from '../utils/simpleUrl';
import { createBrowserClient } from '../utils/supabase/client';
import type { BookmarkFeedItemProps } from './BookmarkFeedItem';
import { Favicon } from './Favicon';
import { FeedItemActions } from './FeedItemActions';
import { Flex } from './Flex';
import { IconButton } from './IconButton';
import { Link } from './Link';
import { Paragraph } from './Paragraph';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { RssFeed } from './RssFeed';
import { TypeToIcon } from './TypeToIcon';

export interface FeedItemFooterProps
  extends Omit<BookmarkFeedItemProps, 'isClamped'> {
  id: string;
  isInFeed?: boolean;
}

export const FeedItemFooter = (props: FeedItemFooterProps) => {
  const supabaseClient = createBrowserClient();
  const {
    url,
    tags,
    created_at,
    modified_at,
    id,
    star,
    type,
    click_count,
    isInFeed,
    feed,
    public: isPublic,
    allowDeletion = false,
    collections,
  } = props;
  const handleClickRegister = useClickBookmark();
  const createdDate = getRelativeDate(created_at);
  const modifiedDate = getRelativeDate(modified_at);
  const dateTooltip =
    created_at !== modified_at
      ? `Created on ${createdDate.formatted}, modified on ${modifiedDate.formatted}`
      : `Created on ${createdDate.formatted}`;

  const handleToggleState = async (
    column: 'public' | 'star',
  ): Promise<void> => {
    const updateData =
      column === 'public' ? { public: !isPublic } : { star: !star };
    await supabaseClient
      .from('bookmarks')
      .update({
        ...updateData,
        modified_at: new Date().toISOString(),
      })
      .match({ id });
  };

  const matchingCollections = useMemo(() => {
    return findMatchingCollections(collections, tags);
  }, [collections, tags]);

  return (
    <TooltipProvider delayDuration={800} skipDelayDuration={500}>
      <div className="feed-item-footer">
        {tags?.length || matchingCollections?.length ? (
          <Flex align="center" gapX="m" gapY="xs" wrap="wrap">
            <ul className="m-0 flex list-none flex-wrap gap-3xs p-0">
              {matchingCollections?.length ? (
                <>
                  <li>
                    <Cards weight="duotone" size={18} />
                  </li>
                  {matchingCollections.map(({ collection }) => (
                    <li key={collection}>
                      <Link
                        href={urlJoin('/collection', collection)}
                        variant="tag"
                      >
                        {collection}
                      </Link>
                    </li>
                  ))}
                </>
              ) : null}
              {tags?.length ? (
                <>
                  <li>
                    <Hash weight="duotone" size={18} />
                  </li>
                  {tags.map((tag) => (
                    <li id={tag} key={tag}>
                      <Link href={urlJoin('/tag', tag)} variant="tag">
                        {tag}
                      </Link>
                    </li>
                  ))}
                </>
              ) : null}
            </ul>
          </Flex>
        ) : null}
        <Flex justify="between" gap="3xs" wrap="wrap">
          <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
            {url ? (
              <>
                <Favicon url={url} />
                <Link
                  rel="external"
                  href={url}
                  onClick={() => handleClickRegister(id)}
                >
                  {simpleUrl(url)}
                </Link>
              </>
            ) : null}

            {allowDeletion === false ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {isPublic ? (
                    <IconButton
                      onClick={() => handleToggleState('public')}
                      size="s"
                    >
                      <Eye size={16} weight="fill" />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={() => handleToggleState('public')}
                      size="s"
                    >
                      <Eye size={16} weight="duotone" />
                    </IconButton>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {isPublic
                    ? 'Make this item private'
                    : 'Make this item public'}
                </TooltipContent>
              </Tooltip>
            ) : null}

            {allowDeletion === false ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {star ? (
                    <IconButton
                      onClick={() => handleToggleState('star')}
                      size="s"
                    >
                      <Star size={16} weight="fill" />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={() => handleToggleState('star')}
                      size="s"
                    >
                      <Star size={16} weight="duotone" />
                    </IconButton>
                  )}
                </TooltipTrigger>
                <TooltipContent>Star/unstar this item</TooltipContent>
              </Tooltip>
            ) : null}

            {type !== null ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Flex align="center">
                    <Link href={urlJoin('/type', type)}>
                      <TypeToIcon type={type} size="16" />
                    </Link>
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>Type: {title(type)}</TooltipContent>
              </Tooltip>
            ) : null}

            {click_count >= MINIMUM_CLICK_COUNT ? (
              <Tooltip>
                <TooltipTrigger>
                  <Flex align="center" gap="3xs">
                    <NavigationArrow weight="duotone" size="16" />
                    {click_count}
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>Click count</TooltipContent>
              </Tooltip>
            ) : null}

            {createdDate.formatted ? (
              <Tooltip>
                <TooltipTrigger>
                  <Flex align="center" gap="3xs">
                    <Calendar weight="duotone" size="16" className="shrink-0" />
                    <time dateTime={created_at}>
                      {createdDate.ago < 8
                        ? createdDate.relative
                        : createdDate.formatted}
                    </time>
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>{dateTooltip}</TooltipContent>
              </Tooltip>
            ) : null}

            {feed && url ? (
              <Popover>
                <PopoverTrigger asChild>
                  <IconButton size="m">
                    <RssSimple
                      aria-label="View latest RSS feed items"
                      size={18}
                      weight="duotone"
                    />
                  </IconButton>
                </PopoverTrigger>
                <PopoverContent>
                  <Suspense fallback={<Paragraph>Loading...</Paragraph>}>
                    <RssFeed feedUrl={fullPath(url, feed)} />
                  </Suspense>
                </PopoverContent>
              </Popover>
            ) : null}
          </Flex>

          <FeedItemActions
            {...props}
            key={`actions-${id}`}
            isInFeed={isInFeed}
          />
        </Flex>
      </div>
    </TooltipProvider>
  );
};
