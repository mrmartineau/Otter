import { memo, type ReactNode } from 'react'
import type { FeedItemModel } from '../hooks/useGroupByDate'
import { cn } from '../utils/classnames'
import { BookmarkFeedItem } from './BookmarkFeedItem'
import { isToot, isTweet } from './Feed'
import { headingVariants } from './Heading'
import { TootFeedItem } from './TootFeedItem'
import { TweetFeedItem } from './TweetFeedItem'

interface FeedSimpleProps {
  title?: ReactNode
  icon?: ReactNode
  items: FeedItemModel[]
}

export const FeedSimple = memo(({ title, icon, items }: FeedSimpleProps) => {
  if (!items?.length) {
    return null
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
        {items.map((item) => {
          if (!item) {
            return null
          }
          if (isTweet(item)) {
            return <TweetFeedItem {...item} key={item.id} />
          } else if (isToot(item)) {
            return <TootFeedItem {...item} key={item.id} />
          }
          return (
            <BookmarkFeedItem {...item} allowDeletion={false} key={item.id} />
          )
        })}
      </div>
    </div>
  )
})

FeedSimple.displayName = 'FeedSimple'
