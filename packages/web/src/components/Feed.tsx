import { EyeIcon, StarIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { FileRouteTypes } from '@tanstack/react-router'
import { memo, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { CONTENT, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { useFeedOptions } from '@/hooks/useFeedOptions'
import { type FeedItemModel, useGroupByDate } from '@/hooks/useGroupByDate'
import { usePagination } from '@/hooks/usePagination'
import { getCollectionsTagsOptions } from '@/utils/fetching/collections'
import type { Bookmark, Toot, Tweet } from '../types/db'
import { cn } from '../utils/classnames'
import { BookmarkFeedItem } from './BookmarkFeedItem'
import { Flex } from './Flex'
import { headingVariants } from './Heading'
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
  offset?: number
  count: number
  limit?: number
  allowGroupByDate?: boolean
  feedType?: 'tweets' | 'bookmarks' | 'toots'
  showFeedOptions?: boolean
  from?: FileRouteTypes['fullPaths']
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
    showFeedOptions = true,
    from,
  }: FeedProps) => {
    const { starQuery, publicQuery, setStarQuery, setPublicQuery } =
      useFeedOptions()
    const { groupByDate, groupedItems } = useGroupByDate(items)
    const { handleUpdateOffset, hasOldItems, hasNewItems } = usePagination({
      count,
      from,
      limit,
      offset,
    })
    const { data: collectionsTags } = useSuspenseQuery(
      getCollectionsTagsOptions(),
    )

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

    // // TODO: move this to usequery
    // useEffect(() => {
    //   const getCollections = async () => {
    //     const collectionTagsResponse = await supabase
    //       .from('collection_tags_view')
    //       .select('*')
    //     setCollections(collectionTagsResponse.data)
    //   }
    //   getCollections()
    // }, [])

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
            {showFeedOptions ? (
              <Flex gap="3xs">
                <Button
                  onClick={() => handleToggleState('star')}
                  size="xs"
                  variant="ghost"
                  aria-pressed={starQuery}
                >
                  <StarIcon size={16} weight={starQuery ? 'fill' : 'duotone'} />{' '}
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
              </Flex>
            ) : null}
          </Flex>
          {subNav ? (
            <Flex gapX="3xs" gapY="3xs" wrap="wrap">
              {subNav.map(({ href, text, isActive, icon }) => {
                return (
                  <SidebarLink href={href} isActive={isActive} key={href}>
                    {icon}
                    {text}
                  </SidebarLink>
                )
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
                      if (!item) {
                        return null
                      }
                      if (isTweet(item)) {
                        return <TweetFeedItem {...item} key={item.id} />
                      } else if (isToot(item)) {
                        return <TootFeedItem {...item} key={item.id} />
                      }
                      return (
                        <BookmarkFeedItem
                          {...item}
                          allowDeletion={allowDeletion}
                          collections={collectionsTags ?? []}
                          key={item.id}
                        />
                      )
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
            {items?.length ? (
              items.map((item) => {
                if (!item) {
                  return null
                }
                if (isTweet(item)) {
                  return <TweetFeedItem {...item} key={item.id} />
                } else if (isToot(item)) {
                  return <TootFeedItem {...item} key={item.id} />
                }
                return (
                  <BookmarkFeedItem
                    {...item}
                    allowDeletion={allowDeletion}
                    collections={collectionsTags ?? []}
                    key={item.id}
                  />
                )
              })
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        )}

        {/* Next/previous navigation */}
        {hasOldItems || hasNewItems ? (
          <Flex align="center" justify="center" gap="s" className="mt-m">
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
    )
  },
)

Feed.displayName = 'Feed'
