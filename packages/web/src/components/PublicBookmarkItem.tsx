import { CalendarIcon, HashIcon } from '@phosphor-icons/react'
import type { Bookmark } from '@/types/db'
import { getRelativeDate } from '@/utils/dates'
import { fullPath } from '@/utils/fullPath'
import { simpleUrl } from '@/utils/simpleUrl'
import { Favicon } from './Favicon'
import { Flex } from './Flex'
import { Markdown } from './Markdown'
import { TypeToIcon } from './TypeToIcon'

export const PublicBookmarkItem = (props: Bookmark) => {
  const { title, url, description, image, tags, type, created_at } = props
  const createdDate = getRelativeDate(created_at)

  return (
    <div className="card feed-item">
      <div className="feed-item-cols">
        <div className="feed-item-content">
          {url && title ? (
            <div>
              <a
                href={url}
                className="link-base link-feed-title"
                target="_blank"
                rel="noopener noreferrer"
              >
                {title}
              </a>
            </div>
          ) : title ? (
            <div>{title}</div>
          ) : null}
          {description ? <Markdown>{description}</Markdown> : null}
        </div>
        {image && url ? (
          <div>
            <img src={fullPath(url, image)} alt="" className="feed-image" />
          </div>
        ) : null}
      </div>
      <div className="feed-item-footer">
        {tags?.length ? (
          <Flex align="center" gapX="m" gapY="xs" wrap="wrap">
            <ul className="m-0 flex list-none flex-wrap gap-3xs p-0">
              <li>
                <HashIcon weight="duotone" size={18} />
              </li>
              {tags.map((tag) => (
                <li key={tag}>
                  <span className="link-base link-tag">{tag}</span>
                </li>
              ))}
            </ul>
          </Flex>
        ) : null}
        <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
          {url ? (
            <>
              <Favicon url={url} />
              <a
                href={url}
                className="link-base link-default"
                target="_blank"
                rel="noopener noreferrer"
              >
                {simpleUrl(url)}
              </a>
            </>
          ) : null}
          {type !== null ? (
            <Flex align="center">
              <TypeToIcon type={type} size="16" />
            </Flex>
          ) : null}
          {createdDate.formatted ? (
            <Flex align="center" gap="3xs">
              <CalendarIcon weight="duotone" size="16" className="shrink-0" />
              <time dateTime={created_at}>
                {createdDate.ago < 8
                  ? createdDate.relative
                  : createdDate.formatted}
              </time>
            </Flex>
          ) : null}
        </Flex>
      </div>
    </div>
  )
}
