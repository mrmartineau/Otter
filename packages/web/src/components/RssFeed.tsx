import { useQuery } from '@tanstack/react-query'
import urlJoin from 'proper-url-join'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/classnames'
import { getRssOptions } from '@/utils/fetching/rss'
import { API_RSS, CONTENT } from '../constants'
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
  console.log(`🚀 ~ RssFeed ~ feedUrl:`, feedUrl)
  const { data: feed } = useQuery(getRssOptions(feedUrl))
  console.log(`🚀 ~ RssFeed ~ feed:`, feed)

  const entries = feed?.entries?.slice(0, 5) || []

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
    </>
  )
}
