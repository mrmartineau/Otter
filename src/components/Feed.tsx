'use client';

import { Button } from '@/components/ui/button';
import { CONTENT, DEFAULT_API_RESPONSE_LIMIT } from '@/src/constants';
import { FeedItemModel, useGroupByDate } from '@/src/hooks/useGroupByDate';
import { usePagination } from '@/src/hooks/usePagination';
import { ReactNode, memo } from 'react';

import { useRealtimeFeed } from '../hooks/useRealtime';
import { Bookmark, Toot, Tweet } from '../types/db';
import { BookmarkFeedItem } from './BookmarkFeedItem';
import { Flex } from './Flex';
import { headingVariants } from './Heading';
import { TootFeedItem } from './TootFeedItem';
import { TweetFeedItem } from './TweetFeedItem';

interface FeedProps {
  title?: ReactNode;
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
  }: FeedProps) => {
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

    return (
      <div className="pt-space-m">
        <Flex gapX="2xs" wrap="wrap" justify="between">
          <div>
            {title ? (
              <h3 className="mt-0 flex items-center gap-2xs">
                {icon}
                {title}
              </h3>
            ) : null}
          </div>
        </Flex>

        {allowGroupByDate && groupByDate ? (
          <div className="gap-sm bp2:gap-md grid">
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
                      }
                      if (isToot(item)) {
                        return <TootFeedItem {...item} key={item.id} />;
                      }

                      return (
                        <BookmarkFeedItem
                          {...item}
                          allowDeletion={allowDeletion}
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
          <div className="gap-sm bp1:gap-md grid">
            {realtimeItems?.length ? (
              realtimeItems.map((item) => {
                if (isTweet(item)) {
                  return <TweetFeedItem {...item} key={item.id} />;
                }
                if (isToot(item)) {
                  return <TootFeedItem {...item} key={item.id} />;
                }
                return (
                  <BookmarkFeedItem
                    {...item}
                    allowDeletion={allowDeletion}
                    key={item.id}
                  />
                );
              })
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        )}

        {/* Next/previos navigation */}
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
