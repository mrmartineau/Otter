import { NoteIcon } from '@phosphor-icons/react'
import { useClickBookmark } from '../hooks/useClickBookmark'
import type { Bookmark } from '../types/db'
import { FeedItemFooter } from './FeedItemFooter'
import { Flex } from './Flex'
import { Link } from './Link'
import { Markdown } from './Markdown'

export const BookmarkFeedItemSimple = (props: Bookmark) => {
  const { title, url, description, note, id } = props
  const handleClickRegister = useClickBookmark()

  return (
    <div className="feed-item feed-item-small">
      <div className="feed-item-content">
        {url && title ? (
          <div>
            <Link
              href={url}
              variant="feedTitle"
              onClick={() => handleClickRegister(id)}
            >
              {title}
            </Link>
          </div>
        ) : title ? (
          <div>{title}</div>
        ) : null}
        {description ? <Markdown>{description}</Markdown> : null}
        <div className="feed-item-small-content">
          {note ? (
            <div className="feed-item-note">
              <Flex
                gap="2xs"
                align="center"
                className="mb-s border-b-2 border-solid border-theme7 pb-3xs text-step--1"
              >
                <NoteIcon
                  aria-label="Note"
                  weight="duotone"
                  size={20}
                  className="shrink-0 text-theme10"
                />
                Note
              </Flex>
              <Markdown>{note}</Markdown>
            </div>
          ) : null}
          <FeedItemFooter {...props} key={`footer-${id}`} />
        </div>
      </div>
    </div>
  )
}
