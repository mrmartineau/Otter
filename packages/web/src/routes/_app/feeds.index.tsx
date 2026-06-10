import { FolderIcon, RssSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { AddFeedForm } from '@/components/AddFeedForm'
import { Favicon } from '@/components/Favicon'
import { FeedEntryItem } from '@/components/FeedEntryItem'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { IconButton } from '@/components/IconButton'
import { Link } from '@/components/Link'
import { Loader } from '@/components/Loader'
import { CONTENT, createTitle, ROUTE_FEEDS } from '@/constants'
import { cn } from '@/utils/classnames'
import {
  getFeedSubscriptionsOptions,
  useDeleteFeedSubscriptionMutation,
} from '@/utils/fetching/feeds'
import { getRssOptions } from '@/utils/fetching/rss'

const MAX_RIVER_ENTRIES = 100

export const Route = createFileRoute('/_app/feeds/')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('feedsTitle'),
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    folder:
      typeof search.folder === 'string' && search.folder
        ? search.folder
        : undefined,
  }),
})

function Page() {
  const { folder } = useSearch({ from: '/_app/feeds/' })
  const { data } = useSuspenseQuery(getFeedSubscriptionsOptions())
  const deleteSubscription = useDeleteFeedSubscriptionMutation()

  const subscriptions = data?.data ?? []
  const visibleSubscriptions = folder
    ? subscriptions.filter((subscription) => subscription.folder === folder)
    : subscriptions

  const { feeds, isFetchingEntries } = useQueries({
    combine: (results) => ({
      feeds: results.map((result) => result.data),
      isFetchingEntries: results.some((result) => result.isLoading),
    }),
    queries: visibleSubscriptions.map((subscription) =>
      getRssOptions(subscription.feed_url),
    ),
  })

  // merge every subscription's entries into a single river, newest first
  const entries = visibleSubscriptions
    .flatMap((subscription, index) =>
      (feeds[index]?.entries ?? []).map((entry) => ({
        entry,
        source: {
          id: subscription.id,
          siteUrl: subscription.site_url,
          title: subscription.title,
        },
      })),
    )
    .sort((a, b) => {
      const aTime = new Date(a.entry.published ?? 0).getTime() || 0
      const bTime = new Date(b.entry.published ?? 0).getTime() || 0
      return bTime - aTime
    })
    .slice(0, MAX_RIVER_ENTRIES)

  const handleUnsubscribe = (id: string, title: string | null) => {
    deleteSubscription.mutate(
      { id },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: () => {
          toast.success('Unsubscribed', { description: title ?? undefined })
        },
      },
    )
  }

  return (
    <div className="feed">
      <Flex gap="xs" direction="column">
        <h3
          className={cn(
            headingVariants({ variant: 'feedTitle' }),
            'flex items-center gap-2xs',
          )}
        >
          {folder ? (
            <FolderIcon weight="duotone" size={24} />
          ) : (
            <RssSimpleIcon weight="duotone" size={24} />
          )}
          {folder ? `${CONTENT.feedsTitle}: ${folder}` : CONTENT.feedsTitle}
        </h3>
        {folder ? (
          <Link href={ROUTE_FEEDS}>← All feeds</Link>
        ) : (
          <AddFeedForm subscriptions={subscriptions} />
        )}
      </Flex>

      {visibleSubscriptions.length ? (
        <>
          <h4 className={headingVariants({ variant: 'date' })}>
            Subscriptions
          </h4>
          <div className="grid gap-2xs">
            {visibleSubscriptions.map((subscription) => (
              <Flex align="center" gapX="2xs" wrap="wrap" key={subscription.id}>
                {subscription.site_url ? (
                  <Favicon url={subscription.site_url} />
                ) : (
                  <RssSimpleIcon size={18} weight="duotone" />
                )}
                <Link href={`/feeds/${subscription.id}`}>
                  {subscription.title ?? subscription.feed_url}
                </Link>
                {subscription.folder && !folder ? (
                  <Link
                    href={ROUTE_FEEDS}
                    // @ts-expect-error How do I type search params?
                    search={{ folder: subscription.folder }}
                    variant="tag"
                  >
                    {subscription.folder}
                  </Link>
                ) : null}
                <IconButton
                  size="s"
                  onClick={() =>
                    handleUnsubscribe(subscription.id, subscription.title)
                  }
                  disabled={deleteSubscription.isPending}
                >
                  <TrashIcon
                    aria-label={`Unsubscribe from ${subscription.title ?? subscription.feed_url}`}
                    size={16}
                    weight="duotone"
                  />
                </IconButton>
              </Flex>
            ))}
          </div>

          <h4 className={headingVariants({ variant: 'date' })}>
            {CONTENT.latestRssItems}
          </h4>
          <div className="mt-s grid gap-m">
            {entries.map(({ entry, source }) => (
              <FeedEntryItem
                entry={entry}
                source={source}
                key={`${source.id}-${entry.link ?? entry.title}`}
              />
            ))}
            {!entries.length && !isFetchingEntries ? (
              <div>{CONTENT.noItems}</div>
            ) : null}
          </div>
          {isFetchingEntries ? (
            <div className="mt-m flex justify-center">
              <Loader />
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-m">
          {folder
            ? 'No feeds in this folder.'
            : 'No feed subscriptions yet. Add a feed above or import an OPML file.'}
        </p>
      )}
    </div>
  )
}
