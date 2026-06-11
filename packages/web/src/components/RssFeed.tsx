import { RssSimpleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/utils/classnames'
import {
  getFeedSubscriptionsOptions,
  useAddFeedSubscriptionMutation,
} from '@/utils/fetching/feeds'
import { getRssOptions } from '@/utils/fetching/rss'
import { CONTENT } from '../constants'
import { Button } from './Button'
import { headingVariants } from './Heading'
import { Link } from './Link'

export interface FeedResponse {
  title: string
  atom_link: AtomLink
  link: string
  description: string
  lastBuildDate: string
  language: string
  sy_updatePeriod: string
  sy_updateFrequency: string
  image: Image
  items: Item[]
}

export interface AtomLink {
  _attrs: Attrs
}

export interface Attrs {
  href: string
  rel: string
  type: string
}

export interface Image {
  url: string
  title: string
  link: string
  width: string
  height: string
}

export interface Item {
  title: string
  link: string
  dc_creator: string
  pubDate: string
  category: string[]
  guid: string
  description: string
  content_encoded: string
  guid_isPermaLink: string
  comments?: string
  wfw_commentRss?: string
  slash_comments?: string
}

interface RssFeedProps {
  feedUrl: string
}
export const RssFeed = ({ feedUrl }: RssFeedProps) => {
  const { data: feed } = useQuery(getRssOptions(feedUrl))
  const { data: subscriptions } = useQuery(getFeedSubscriptionsOptions())
  const addFeed = useAddFeedSubscriptionMutation()

  const entries = feed?.entries?.slice(0, 5) || []
  const isSubscribed = subscriptions?.data?.some(
    (subscription) => subscription.feed_url === feedUrl,
  )

  const handleSubscribe = () => {
    addFeed.mutate(
      { url: feedUrl },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: ({ data }) => {
          toast.success('Subscribed', {
            description: data.title ?? data.feed_url,
          })
        },
      },
    )
  }

  return (
    <>
      <h5 className={cn('mt-0!', headingVariants({ variant: 'date' }))}>
        {CONTENT.latestRssItems}
      </h5>
      {entries?.length ? (
        <ol className="max-w-260 mb-0 list-inside list-decimal pl-0">
          {entries.map(({ link, title, guid }, index) => {
            const key = guid ? guid['#text'] : index
            return (
              <li key={key} className="text-sm">
                <Link href={link} className="!inline">
                  {title}
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        'Loading...'
      )}
      <Button
        size="2xs"
        variant="outline"
        className="mt-2xs"
        onClick={handleSubscribe}
        disabled={isSubscribed || addFeed.isPending}
      >
        <RssSimpleIcon size={14} weight="duotone" />
        {isSubscribed
          ? 'Subscribed'
          : addFeed.isPending
            ? 'Subscribing…'
            : 'Subscribe in Otter'}
      </Button>
    </>
  )
}
