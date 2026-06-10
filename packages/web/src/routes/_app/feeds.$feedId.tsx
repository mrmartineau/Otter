import { FolderIcon, RssSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Favicon } from '@/components/Favicon'
import { FeedEntryItem } from '@/components/FeedEntryItem'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { Input } from '@/components/Input'
import { Link } from '@/components/Link'
import { Loader } from '@/components/Loader'
import { CONTENT, createTitle, ROUTE_FEEDS } from '@/constants'
import { cn } from '@/utils/classnames'
import {
  getFeedSubscriptionOptions,
  useDeleteFeedSubscriptionMutation,
  useUpdateFeedSubscriptionMutation,
} from '@/utils/fetching/feeds'
import { getRssOptions } from '@/utils/fetching/rss'

export const Route = createFileRoute('/_app/feeds/$feedId')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('feedsTitle'),
      },
    ],
  }),
})

function Page() {
  const { feedId } = Route.useParams()
  const navigate = useNavigate()
  const { data } = useSuspenseQuery(getFeedSubscriptionOptions(feedId))
  const subscription = data.data
  const { data: feed, isLoading } = useQuery(
    getRssOptions(subscription.feed_url),
  )
  const updateSubscription = useUpdateFeedSubscriptionMutation()
  const deleteSubscription = useDeleteFeedSubscriptionMutation()
  const [folder, setFolder] = useState(subscription.folder ?? '')

  const handleFolderSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSubscription.mutate(
      { folder: folder.trim() || null, id: subscription.id },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: () => {
          toast.success('Feed updated')
        },
      },
    )
  }

  const handleUnsubscribe = () => {
    deleteSubscription.mutate(
      { id: subscription.id },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: () => {
          toast.success('Unsubscribed', {
            description: subscription.title ?? undefined,
          })
          void navigate({ search: { folder: undefined }, to: ROUTE_FEEDS })
        },
      },
    )
  }

  return (
    <div className="feed">
      <Flex gap="xs" direction="column">
        <Flex gap="xs" justify="between" wrap="wrap" align="center">
          <h3
            className={cn(
              headingVariants({ variant: 'feedTitle' }),
              'flex items-center gap-2xs',
            )}
          >
            <RssSimpleIcon weight="duotone" size={24} />
            {subscription.title ?? subscription.feed_url}
          </h3>
          <Button
            size="xs"
            variant="ghost"
            onClick={handleUnsubscribe}
            disabled={deleteSubscription.isPending}
          >
            <TrashIcon size={16} weight="duotone" />
            Unsubscribe
          </Button>
        </Flex>

        <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
          {subscription.site_url ? (
            <>
              <Favicon url={subscription.site_url} />
              <Link rel="external" href={subscription.site_url}>
                {subscription.site_url}
              </Link>
            </>
          ) : null}
          <Link rel="external" href={subscription.feed_url}>
            {subscription.feed_url}
          </Link>
        </Flex>

        <form onSubmit={handleFolderSave}>
          <Flex align="center" gapX="2xs">
            <FolderIcon size={18} weight="duotone" aria-label="Folder" />
            <Input
              name="folder"
              placeholder="Folder"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              className="max-w-60"
            />
            <Button
              type="submit"
              size="xs"
              variant="outline"
              disabled={
                updateSubscription.isPending ||
                (folder.trim() || null) === subscription.folder
              }
            >
              Save
            </Button>
          </Flex>
        </form>
      </Flex>

      <h4 className={headingVariants({ variant: 'date' })}>
        {CONTENT.latestRssItems}
      </h4>
      <div className="mt-s grid gap-m">
        {feed?.entries?.length ? (
          feed.entries.map((entry, index) => (
            <FeedEntryItem entry={entry} key={entry.link ?? index} />
          ))
        ) : isLoading ? (
          <div className="flex justify-center">
            <Loader />
          </div>
        ) : (
          <div>{CONTENT.noItems}</div>
        )}
      </div>
    </div>
  )
}
