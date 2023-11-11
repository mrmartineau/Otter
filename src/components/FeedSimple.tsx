import { CONTENT } from '@/src/constants';
import { ReactNode, memo } from 'react';

import { Bookmark } from '../types/db';
import { cn } from '../utils/classnames';
import { BookmarkFeedItem } from './BookmarkFeedItem';
import { headingVariants } from './Heading';

interface FeedSimpleProps {
  title?: ReactNode;
  icon?: ReactNode;
  items: Bookmark[];
}

export const FeedSimple = memo(({ title, icon, items }: FeedSimpleProps) => {
  if (!items?.length) {
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
        {items?.length ? (
          items.map((item) => {
            return <BookmarkFeedItem {...item} key={item.id} isClamped />;
          })
        ) : (
          <div>{CONTENT.noItems}</div>
        )}
      </div>
    </div>
  );
});

FeedSimple.displayName = 'FeedSimple';
