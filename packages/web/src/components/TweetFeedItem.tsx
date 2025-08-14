import { LinkSimpleHorizontalIcon, PlusCircleIcon } from '@phosphor-icons/react'
import urlJoin from 'proper-url-join'
import { cn } from '@/utils/classnames'
import { ROUTE_NEW_BOOKMARK } from '../constants'
import type { Tweet, TweetUrls } from '../types/db'
import { simpleUrl } from '../utils/simpleUrl'
import { Favicon } from './Favicon'
import { Flex } from './Flex'
import { headingVariants } from './Heading'
import { Link } from './Link'
import { Markdown } from './Markdown'

export interface TweetMediaVariant {
  bitrate?: number
  content_type: string
  url: string
}
const getBestQualityVideoVariant = (variants?: TweetMediaVariant[]) => {
  const goodItem = variants?.reduce((acc, item) => {
    const accBitrate = acc?.bitrate
    const itemBitrate = item?.bitrate
    if (itemBitrate !== undefined) {
      acc = item
      if (accBitrate && accBitrate >= 0 && itemBitrate > accBitrate) {
        acc = item
      }
    }
    return acc
  }, {} as TweetMediaVariant)
  return goodItem?.url
}

export const TweetFeedItem = (props: Tweet) => {
  const { text, user_avatar, user_id, user_name, urls, tweet_url, media } =
    props
  const tweetUrls = urls as TweetUrls
  const tweetMedia = media as any[]

  return (
    <div className="card feed-item">
      <div className="flex items-center gap-xs">
        {user_avatar ? (
          <img src={user_avatar} alt="" className="feed-avatar" />
        ) : null}
        <Flex direction="column">
          <div className="text-step--1">{user_name}</div>
          <div className="text-step--2">@{user_id}</div>
        </Flex>
      </div>

      {text ? <Markdown>{text}</Markdown> : null}

      {tweet_url ? (
        <div>
          <Link
            rel="external"
            href={tweet_url}
            className="flex items-center gap-2xs text-step--1"
          >
            <LinkSimpleHorizontalIcon weight="duotone" size="14" /> Tweet
          </Link>
        </div>
      ) : null}

      {tweetUrls?.length ? (
        <div>
          <h3 className={cn(headingVariants({ variant: 'date' }), 'mt-0!')}>
            URLs
          </h3>
          <ul className="flex flex-col gap-2xs">
            {tweetUrls.map((item) => {
              return (
                <li
                  key={item.expanded_url}
                  className="flex items-center gap-2xs overflow-hidden text-step--1"
                >
                  <Link
                    href={urlJoin(ROUTE_NEW_BOOKMARK, {
                      query: {
                        url: item.expanded_url,
                      },
                    })}
                    variant="add"
                  >
                    <PlusCircleIcon weight="duotone" size={14} /> Add
                  </Link>
                  <Favicon url={item.expanded_url} />
                  <div className="truncate">
                    <Link href={item.expanded_url}>
                      {simpleUrl(item.expanded_url)}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {tweetMedia?.length ? (
        <div>
          <h3 className={cn(headingVariants({ variant: 'date' }), 'mt-0!')}>
            Media
          </h3>
          <div className="toot-media-grid">
            {tweetMedia.map((item) => {
              const isVideoType =
                item.type === 'animated_gif' || item.type === 'video'
              const isPhotoType = item.type === 'photo'
              return (
                <div key={item.id}>
                  {isVideoType ? (
                    // biome-ignore lint/a11y/useMediaCaption: No captions for tweets
                    <video
                      src={getBestQualityVideoVariant(
                        item.video_info?.variants
                      )}
                      controls
                      className="max-w-full"
                    />
                  ) : isPhotoType ? (
                    <img
                      src={item.url}
                      alt={item?.description}
                      className="max-w-full rounded-md"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
