import { LinkSimpleHorizontalIcon, PlusCircleIcon } from '@phosphor-icons/react'
import clsx from 'clsx'
import urlJoin from 'proper-url-join'
import { cn } from '@/utils/classnames'
import { ROUTE_NEW_BOOKMARK } from '../constants'
import type { Toot, TootUrls } from '../types/db'
import { simpleUrl } from '../utils/simpleUrl'
import { Favicon } from './Favicon'
import { Flex } from './Flex'
import { headingVariants } from './Heading'
import { Link } from './Link'
import { Markdown } from './Markdown'

export const TootFeedItem = (props: Toot) => {
  const { text, user_avatar, user_id, user_name, urls, toot_url, media } = props
  const tootUrls = (urls as TootUrls).filter((item) => {
    const isHashTag = item.href.includes('/tags/')
    const isDodgyLink = item.href.includes('</span>')
    const isMention = item.href.includes('/@')
    const noProtocol = !item.value.includes('http')
    if (isHashTag || isDodgyLink || isMention || noProtocol) return false
    return true
  })
  const tootMedia = media as any[]

  return (
    <div className="card feed-item">
      <div className="feed-item-cols">
        <div className="feed-item-content">
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
        </div>
        {tootMedia?.length ? (
          <div>
            <h3 className={cn(headingVariants({ variant: 'date' }), 'mt-0!')}>
              Media
            </h3>
            <div className="toot-media-grid">
              {tootMedia.map((item) => {
                const isVideoType =
                  item.type === 'gifv' || item.type === 'video'
                const isPhotoType = item.type === 'image'
                return (
                  <div key={item.id}>
                    {isVideoType ? (
                      // biome-ignore lint/a11y/useMediaCaption: no need
                      <video src={item.url} controls className="max-w-full" />
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

      <div className="flex flex-col gap-2xs">
        {toot_url ? (
          <div>
            <Link
              rel="external"
              href={toot_url}
              className="flex items-center gap-2xs text-step--1"
            >
              <LinkSimpleHorizontalIcon weight="duotone" size="14" /> Toot
            </Link>
          </div>
        ) : null}
        {tootUrls?.length ? (
          <div>
            <h3 className={clsx(headingVariants({ variant: 'date' }), 'mt-0!')}>
              URLs
            </h3>
            <ul className="flex flex-col gap-2xs">
              {tootUrls.map((item) => {
                return (
                  <li
                    key={item.href}
                    className="flex items-center gap-2xs overflow-hidden text-step--1"
                  >
                    <Link
                      href={urlJoin(ROUTE_NEW_BOOKMARK, {
                        query: {
                          url: item.href,
                        },
                      })}
                      variant="add"
                    >
                      <PlusCircleIcon weight="duotone" size={14} /> Add
                    </Link>
                    <Favicon url={item.href} />
                    <div className="truncate">
                      <Link href={item.href}>{simpleUrl(item.href)}</Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
