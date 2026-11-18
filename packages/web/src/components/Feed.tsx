import {
  ClockCounterClockwiseIcon,
  EyeIcon,
  StarIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { FileRouteTypes } from '@tanstack/react-router'
import { type CSSProperties, memo, type ReactNode, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useResizeObserver } from 'usehooks-ts'
import { Button } from '@/components/Button'
import { CONTENT, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { useFeedOptions } from '@/hooks/useFeedOptions'
import { type FeedView, useFeedView } from '@/hooks/useFeedView'
import { type FeedItemModel, useGroupByDate } from '@/hooks/useGroupByDate'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { getCollectionsTagsOptions } from '@/utils/fetching/collections'
import type { ShareKind } from '@/utils/fetching/shares'
import type { Bookmark, Collection, Toot, Tweet } from '../types/db'
import { cn } from '../utils/classnames'
import { BookmarkCard } from './BookmarkCard'
import { BookmarkCompactItem } from './BookmarkCompactItem'
import { BookmarkFeedItem } from './BookmarkFeedItem'
import { FeedViewSwitch } from './FeedViewSwitch'
import { Flex } from './Flex'
import { headingVariants } from './Heading'
import { Loader } from './Loader'
import { ShareDialog } from './ShareDialog'
import { SidebarLink } from './SidebarLink'
import { TootFeedItem } from './TootFeedItem'
import { TweetFeedItem } from './TweetFeedItem'

interface FeedProps {
  title: ReactNode
  subNav?: {
    text: string
    href: string
    isActive?: boolean
    icon?: ReactNode
  }[]
  icon?: ReactNode
  items: FeedItemModel[]
  allowDeletion?: boolean
  count: number
  limit?: number
  allowGroupByDate?: boolean
  feedType?: 'tweets' | 'bookmarks' | 'toots'
  showFeedOptions?: boolean
  from?: FileRouteTypes['fullPaths']
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
  shareConfig?: { kind: ShareKind; name: string }
}

export function isBookmark(item: FeedItemModel): item is Bookmark {
  return 'title' in item
}
export function isTweet(item: FeedItemModel): item is Tweet {
  return 'tweet_id' in item
}
export function isToot(item: FeedItemModel): item is Toot {
  return 'toot_id' in item
}

// Matches the --space-s gap in .feed-cards
const CARD_MIN_WIDTH = 240
const CARD_GAP = 16
const MAX_CARD_COLUMNS = 3

/**
 * Deals the cards into columns in turn (1st → column 1, 2nd → column 2…), so
 * the newest stay along the top and loading more only adds to the bottom.
 */
const FeedCards = ({
  items,
  allowDeletion,
  collections,
}: {
  items: Bookmark[]
  allowDeletion: boolean
  collections: Collection[]
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { width = 0 } = useResizeObserver({ ref })
  const columnCount = Math.min(
    MAX_CARD_COLUMNS,
    Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP))),
  )
  const columns = Array.from({ length: columnCount }, (_, column) =>
    items
      .map((item, index) => ({ index, item }))
      .filter(({ index }) => index % columnCount === column),
  )

  return (
    <div
      ref={ref}
      className="feed-cards"
      style={{ '--columns': columnCount } as CSSProperties}
    >
      {columns.map((column, columnIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: columns have no identity beyond their position
        <div className="feed-cards-column" key={columnIndex}>
          {column.map(({ item, index }) => (
            <BookmarkCard
              {...item}
              allowDeletion={allowDeletion}
              collections={collections}
              index={index}
              key={item.id}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface FeedItemsProps {
  items: FeedItemModel[]
  view: FeedView
  allowDeletion: boolean
  collections: Collection[]
}

const FeedItems = ({
  items,
  view,
  allowDeletion,
  collections,
}: FeedItemsProps) => {
  if (view === 'compact') {
    return (
      <ul className="feed-compact">
        {items.filter(isBookmark).map((item) => (
          <BookmarkCompactItem
            {...item}
            allowDeletion={allowDeletion}
            collections={collections}
            key={item.id}
          />
        ))}
      </ul>
    )
  }

  if (view === 'cards') {
    return (
      <FeedCards
        items={items.filter(isBookmark)}
        allowDeletion={allowDeletion}
        collections={collections}
      />
    )
  }

  return (
    <div className="grid gap-m">
      {items.map((item) => {
        if (!item) {
          return null
        }
        if (isTweet(item)) {
          return <TweetFeedItem {...item} key={item.id} />
        }
        if (isToot(item)) {
          return <TootFeedItem {...item} key={item.id} />
        }
        return (
          <BookmarkFeedItem
            {...item}
            allowDeletion={allowDeletion}
            collections={collections}
            key={item.id}
          />
        )
      })}
    </div>
  )
}

export const Feed = memo(
  ({
    title,
    icon,
    items,
    allowDeletion = false,
    count: _count,
    limit: _limit = DEFAULT_API_RESPONSE_LIMIT,
    allowGroupByDate = false,
    subNav,
    showFeedOptions = true,
    from: _from,
    hasNextPage = false,
    isFetchingNextPage = false,
    fetchNextPage,
    shareConfig,
    feedType,
  }: FeedProps) => {
    const {
      starQuery,
      publicQuery,
      windowQuery,
      setStarQuery,
      setPublicQuery,
      setWindowQuery,
    } = useFeedOptions()
    const { groupByDate, groupedItems } = useGroupByDate(items)
    const { sentinelRef } = useInfiniteScroll({
      fetchNextPage: fetchNextPage ?? (() => {}),
      hasNextPage,
      isFetchingNextPage,
    })
    const { data: collectionsTags } = useSuspenseQuery(
      getCollectionsTagsOptions(),
    )
    const [savedView, setView] = useFeedView()
    // Tweets and toots only have the list layout
    const canSwitchView = feedType !== 'tweets' && feedType !== 'toots'
    const view = canSwitchView ? savedView : 'list'
    // Date headings split the cards' columns apart, so cards ignore the setting
    const showDateGroups = allowGroupByDate && groupByDate && view !== 'cards'

    const handleToggleState = async (
      column: 'public' | 'star',
    ): Promise<void> => {
      if (column === 'public') {
        setPublicQuery((prev) => !prev)
      }
      if (column === 'star') {
        setStarQuery((prev) => !prev)
      }
    }

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
            <Flex gap="xs" align="center" wrap="wrap">
              {showFeedOptions || shareConfig ? (
                <Flex gap="3xs">
                  {showFeedOptions ? (
                    <>
                      <Button
                        onClick={() => handleToggleState('star')}
                        size="xs"
                        variant="ghost"
                        aria-pressed={starQuery}
                      >
                        <StarIcon
                          size={16}
                          weight={starQuery ? 'fill' : 'duotone'}
                        />{' '}
                        Stars
                      </Button>
                      <Button
                        onClick={() => handleToggleState('public')}
                        size="xs"
                        variant="ghost"
                        aria-pressed={publicQuery}
                      >
                        <EyeIcon
                          size={16}
                          weight={publicQuery ? 'fill' : 'duotone'}
                        />{' '}
                        Public
                      </Button>
                      <Button
                        onClick={() => setWindowQuery((prev) => prev + 1)}
                        size="xs"
                        variant="ghost"
                        aria-pressed={windowQuery > 0}
                        title="Click again to go back another 7 days"
                      >
                        <ClockCounterClockwiseIcon
                          size={16}
                          weight={windowQuery > 0 ? 'fill' : 'duotone'}
                        />{' '}
                        {windowQuery > 1
                          ? `${(windowQuery - 1) * 7 + 1}–${windowQuery * 7} days ago`
                          : 'Last 7 days'}
                      </Button>
                      {windowQuery > 0 ? (
                        <Button
                          onClick={() => setWindowQuery(0)}
                          size="xs"
                          variant="ghost"
                          aria-label="Clear date filter"
                        >
                          <XIcon size={16} />
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {shareConfig ? (
                    <ShareDialog
                      kind={shareConfig.kind}
                      name={shareConfig.name}
                    />
                  ) : null}
                </Flex>
              ) : null}
              {canSwitchView ? (
                <FeedViewSwitch view={view} onChange={setView} />
              ) : null}
            </Flex>
          </Flex>
          {subNav ? (
            <Flex gapX="3xs" gapY="3xs" wrap="wrap">
              {subNav.map(({ href, text, isActive, icon }) => {
                return (
                  <SidebarLink href={href} isActive={isActive} key={href}>
                    <>
                      {icon}
                      {text}
                    </>
                  </SidebarLink>
                )
              })}
            </Flex>
          ) : null}
        </Flex>

        {!items?.length ? (
          <div className="mt-m">{CONTENT.noItems}</div>
        ) : showDateGroups ? (
          <div className="bp2:gap-m grid gap-s" key={view}>
            {groupedItems.map((groupedItem) => (
              <div key={groupedItem.date}>
                <h3 className={headingVariants({ variant: 'date' })}>
                  {groupedItem.date}
                </h3>
                <ErrorBoundary fallback={<div>Something went wrong</div>}>
                  <FeedItems
                    items={groupedItem.items}
                    view={view}
                    allowDeletion={allowDeletion}
                    collections={collectionsTags ?? []}
                  />
                </ErrorBoundary>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-m" key={view}>
            <FeedItems
              items={items}
              view={view}
              allowDeletion={allowDeletion}
              collections={collectionsTags ?? []}
            />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="mt-m flex justify-center">
          {isFetchingNextPage ? <Loader /> : null}
        </div>
      </div>
    )
  },
)

Feed.displayName = 'Feed'
