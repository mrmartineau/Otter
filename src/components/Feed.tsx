'use client';

import { Button } from '@/src/components/Button';
import { CONTENT, DEFAULT_API_RESPONSE_LIMIT } from '@/src/constants';
import { FeedItemModel, useGroupByDate } from '@/src/hooks/useGroupByDate';
import { usePagination } from '@/src/hooks/usePagination';
import { Eye, Star } from '@phosphor-icons/react';
import { parseAsBoolean, useQueryState } from 'next-usequerystate';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, memo, useCallback, useEffect, useState } from 'react';

import { useRealtimeFeed } from '../hooks/useRealtime';
import { Bookmark, Toot, Tweet } from '../types/db';
import { cn } from '../utils/classnames';
import { createBrowserClient } from '../utils/supabase/client';
import { BookmarkFeedItem } from './BookmarkFeedItem';
import { Flex } from './Flex';
import { headingVariants } from './Heading';
import { SidebarLink } from './SidebarLink';
import { TootFeedItem } from './TootFeedItem';
import { TweetFeedItem } from './TweetFeedItem';

interface FeedProps {
  title: ReactNode;
  subNav?: {
    text: string;
    href: string;
    isActive?: boolean;
    icon?: ReactNode;
  }[];
  icon?: ReactNode;
  items: FeedItemModel[];
  allowDeletion?: boolean;
  offset?: number;
  count: number;
  limit?: number;
  allowGroupByDate?: boolean;
  feedType?: 'tweets' | 'bookmarks' | 'toots';
}

export function isBookmark(item: FeedItemModel): item is Bookmark {
  return 'title' in item;
}
export function isTweet(item: FeedItemModel): item is Tweet {
  return 'tweet_id' in item;
}
export function isToot(item: FeedItemModel): item is Toot {
  return 'toot_id' in item;
}

export const Feed = memo(
  ({
    title,
    icon,
    items,
    allowDeletion = false,
    count,
    limit = DEFAULT_API_RESPONSE_LIMIT,
    offset = 0,
    allowGroupByDate = false,
    subNav,
  }: FeedProps) => {
    const [collections, setCollections] = useState<any>();
    const supabaseClient = createBrowserClient();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const realtimeItems = useRealtimeFeed({
      initialData: items,
      isTrash: allowDeletion,
    });
    const { groupByDate, groupedItems } = useGroupByDate(realtimeItems);
    const { handleUpdateOffset, hasOldItems, hasNewItems } = usePagination({
      offset,
      limit,
      count,
    });
    const [starQuery, setStarQuery] = useQueryState(
      'star',
      parseAsBoolean.withDefault(false),
    );
    const [publicQuery, setPublicQuery] = useQueryState(
      'public',
      parseAsBoolean.withDefault(false),
    );
    const createQueryString = useCallback(
      (newParams: { name: string; value: string | boolean }[]) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const { name, value } of newParams) {
          params.set(name, String(value));
        }
        return params.toString();
      },
      [searchParams],
    );

    const handleToggleState = async (
      column: 'public' | 'star',
    ): Promise<void> => {
      let newPublicQuery = publicQuery;
      let newStarQuery = starQuery;
      if (column === 'public') {
        newPublicQuery = !publicQuery;
        setPublicQuery(newPublicQuery);
      }
      if (column === 'star') {
        newStarQuery = !starQuery;
        setStarQuery(newStarQuery);
      }
      router.push(
        `${pathname}?${createQueryString([
          { name: 'star', value: newStarQuery ? 'true' : 'false' },
          { name: 'public', value: newPublicQuery ? 'true' : 'false' },
        ])}`,
      );
    };

    useEffect(() => {
      const getCollections = async () => {
        const collectionTagsResponse = await supabaseClient
          .from('collection_tags_view')
          .select('*');
        setCollections(collectionTagsResponse.data);
      };
      getCollections();
    }, [supabaseClient]);

    return (
      <div className="feed">
        <Flex gap="xs" direction="column" justify="between">
          <Flex gap="xs" justify="between" wrap="wrap" align="center">
            <h3
              className={cn(
                headingVariants({ variant: 'feedTitle' }),
                'flex items-center gap-2xs',
              )}
            >
              {icon}
              {title}
            </h3>
            <Flex gap="3xs">
              <Button
                onClick={() => handleToggleState('star')}
                size="xs"
                variant="ghost"
                aria-pressed={starQuery}
              >
                <Star size={16} weight={starQuery ? 'fill' : 'duotone'} /> Stars
              </Button>
              <Button
                onClick={() => handleToggleState('public')}
                size="xs"
                variant="ghost"
                aria-pressed={publicQuery}
              >
                <Eye size={16} weight={publicQuery ? 'fill' : 'duotone'} />{' '}
                Public
              </Button>
            </Flex>
          </Flex>
          {subNav ? (
            <Flex gapX="3xs" gapY="3xs" wrap="wrap">
              {subNav.map(({ href, text, isActive, icon }) => {
                return (
                  <SidebarLink href={href} isActive={isActive} key={href}>
                    {icon}
                    {text}
                  </SidebarLink>
                );
              })}
            </Flex>
          ) : null}
        </Flex>

        {allowGroupByDate && groupByDate ? (
          <div className="bp2:gap-m grid gap-s">
            {groupedItems?.length ? (
              groupedItems.map((groupedItem) => (
                <div key={groupedItem.date}>
                  <h3 className={headingVariants({ variant: 'date' })}>
                    {groupedItem.date}
                  </h3>
                  <div className="grid gap-m">
                    {groupedItem?.items?.map((item) => {
                      if (isTweet(item)) {
                        return <TweetFeedItem {...item} key={item.id} />;
                      } else if (isToot(item)) {
                        return <TootFeedItem {...item} key={item.id} />;
                      }
                      return (
                        <BookmarkFeedItem
                          {...item}
                          allowDeletion={allowDeletion}
                          collections={collections}
                          key={item.id}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        ) : (
          <div className="mt-m grid gap-m">
            {realtimeItems?.length ? (
              realtimeItems.map((item) => {
                if (isTweet(item)) {
                  return <TweetFeedItem {...item} key={item.id} />;
                } else if (isToot(item)) {
                  return <TootFeedItem {...item} key={item.id} />;
                }
                return (
                  <BookmarkFeedItem
                    {...item}
                    allowDeletion={allowDeletion}
                    collections={collections}
                    key={item.id}
                  />
                );
              })
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        )}

        {/* Next/previous navigation */}
        {hasOldItems || hasNewItems ? (
          <Flex align="center" justify="center" gap="m" className="mt-m">
            {hasNewItems ? (
              <Button
                onClick={() =>
                  handleUpdateOffset(Number(offset) - Number(limit))
                }
                disabled={!hasNewItems}
                // disabledText={CONTENT.noNewerItems}
              >
                {CONTENT.newerBtn}
              </Button>
            ) : null}
            {hasOldItems ? (
              <Button
                onClick={() =>
                  handleUpdateOffset(Number(offset) + Number(limit))
                }
                disabled={!hasOldItems}
                // disabledText={CONTENT.noOlderItems}
              >
                {CONTENT.olderBtn}
              </Button>
            ) : null}
          </Flex>
        ) : null}
      </div>
    );
  },
);

Feed.displayName = 'Feed';
