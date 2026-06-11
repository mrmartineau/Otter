import { CalendarIcon, RssSimpleIcon } from '@phosphor-icons/react'
import type { Entry } from 'worker/rss/rss-to-json'
import { getRelativeDate } from '../utils/dates'
import { Favicon } from './Favicon'
import { Flex } from './Flex'
import { Link } from './Link'

export interface FeedEntryItemProps {
  entry: Entry
  source?: {
    id: string
    title: string | null
    siteUrl: string | null
  }
}

export const FeedEntryItem = ({ entry, source }: FeedEntryItemProps) => {
  const published =
    entry.published && !Number.isNaN(new Date(entry.published).getTime())
      ? getRelativeDate(entry.published)
      : null

  return (
    <div className="feed-item feed-item-small">
      <div className="feed-item-content">
        {entry.link ? (
          <div>
            <Link href={entry.link} variant="feedTitle" rel="external">
              {entry.title || entry.link}
            </Link>
          </div>
        ) : (
          <div>{entry.title}</div>
        )}
        <Flex
          align="center"
          gapX="2xs"
          gapY="2xs"
          wrap="wrap"
          className="mt-2xs text-step--1"
        >
          {source ? (
            <Flex align="center" gap="3xs">
              {source.siteUrl ? (
                <Favicon url={source.siteUrl} />
              ) : (
                <RssSimpleIcon size={16} weight="duotone" />
              )}
              <Link href={`/feeds/${source.id}`}>{source.title ?? 'Feed'}</Link>
            </Flex>
          ) : null}
          {published ? (
            <Flex align="center" gap="3xs">
              <CalendarIcon weight="duotone" size="16" className="shrink-0" />
              <time dateTime={entry.published}>
                {published.ago < 8 ? published.relative : published.formatted}
              </time>
            </Flex>
          ) : null}
        </Flex>
      </div>
    </div>
  )
}
