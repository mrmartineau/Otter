'use client';

import { ReactNode, memo } from 'react';

import { FeedItemModel } from '../hooks/useGroupByDate';
import { useRealtimeFeed } from '../hooks/useRealtime';
import { cn } from '../utils/classnames';
import { BookmarkFeedItem } from './BookmarkFeedItem';
import { isToot, isTweet } from './Feed';
import { headingVariants } from './Heading';
import { TootFeedItem } from './TootFeedItem';
import { TweetFeedItem } from './TweetFeedItem';

interface FeedSimpleProps {
  title?: ReactNode;
  icon?: ReactNode;
  items: FeedItemModel[];
}

export const FeedSimple = memo(({ title, icon, items }: FeedSimpleProps) => {
  const realtimeItems = useRealtimeFeed({
    initialData: items,
    isTrash: false,
  });

  if (!realtimeItems?.length) {
    return null;
  }

  return (
    <div className="feed-simple">
      <h3
        className={cn(
          headingVariants({ variant: 'feedTitle' }),
          'flex items-center gap-2xs',
        )}
      >
        {icon}
        {title}
      </h3>

      <div className="feed-simple-grid">
        {realtimeItems.map((item) => {
          if (isTweet(item)) {
            return <TweetFeedItem {...item} key={item.id} />;
          } else if (isToot(item)) {
            return <TootFeedItem {...item} key={item.id} />;
          }
          return (
            <BookmarkFeedItem {...item} allowDeletion={false} key={item.id} />
          );
        })}
      </div>
    </div>
  );
});

FeedSimple.displayName = 'FeedSimple';
