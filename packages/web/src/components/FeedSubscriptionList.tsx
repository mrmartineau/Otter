import { FolderIcon, RssSimpleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { CONTENT, ROUTE_FEEDS } from '../constants'
import {
  getFeedSubscriptionsOptions,
  groupSubscriptionsByFolder,
} from '../utils/fetching/feeds'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible'
import { Flex } from './Flex'
import { SidebarLink } from './SidebarLink'
import { Text } from './Text'

export const FeedSubscriptionList = () => {
  const { data } = useQuery(getFeedSubscriptionsOptions())
  const subscriptions = data?.data ?? []
  const { folders, unfiled } = groupSubscriptionsByFolder(subscriptions)

  return (
    <Collapsible stateKey="feeds">
      <CollapsibleTrigger>
        {CONTENT.feedsNav} <Text variant="count">{subscriptions.length}</Text>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Flex gapY="3xs" direction="column">
          <SidebarLink href={ROUTE_FEEDS}>
            <RssSimpleIcon aria-label="All feeds" size={18} weight="duotone" />
            All feeds
          </SidebarLink>
          {folders.map(({ folder, feeds }) => (
            <SidebarLink
              href={ROUTE_FEEDS}
              // @ts-expect-error How do I type search params?
              search={{ folder }}
              count={feeds.length}
              key={folder}
            >
              <FolderIcon size={18} weight="duotone" aria-label={folder} />
              {folder}
            </SidebarLink>
          ))}
          {unfiled.map((subscription) => (
            <SidebarLink
              href={`/feeds/${subscription.id}`}
              activePath={`/feeds/${subscription.id}`}
              key={subscription.id}
            >
              <RssSimpleIcon
                size={18}
                weight="duotone"
                aria-label={subscription.title ?? subscription.feed_url}
              />
              {subscription.title ?? subscription.feed_url}
            </SidebarLink>
          ))}
        </Flex>
      </CollapsibleContent>
    </Collapsible>
  )
}
