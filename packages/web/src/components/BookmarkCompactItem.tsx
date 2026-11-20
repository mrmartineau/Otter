import { CaretDownIcon, NoteIcon } from '@phosphor-icons/react'
import { Link as RouterLink } from '@tanstack/react-router'
import urlJoin from 'proper-url-join'
import { useId, useState } from 'react'
import { useClickBookmark } from '@/hooks/useClickBookmark'
import { getRelativeDate } from '@/utils/dates'
import { fullPath } from '@/utils/fullPath'
import { simpleUrl } from '@/utils/simpleUrl'
import { BookmarkActions, BookmarkToggles } from './BookmarkActions'
import type { BookmarkFeedItemProps } from './BookmarkFeedItem'
import { Favicon } from './Favicon'
import { IconButton } from './IconButton'
import { Link } from './Link'
import { Markdown } from './Markdown'
import { TypeToIcon } from './TypeToIcon'

const VISIBLE_TAGS = 2

/** One line per bookmark. Click the row (or the arrow) to see the rest. */
export const BookmarkCompactItem = (props: BookmarkFeedItemProps) => {
  const { id, title, url, description, note, image, tags, type, created_at } = props
  const [isOpen, setIsOpen] = useState(false)
  const detailId = useId()
  const handleClickRegister = useClickBookmark()
  const createdDate = getRelativeDate(created_at)
  const imageUrl = image && url ? fullPath(url, image) : null
  const hiddenTagCount = (tags?.length ?? 0) - VISIBLE_TAGS

  return (
    <li className="bookmark-compact" data-open={isOpen || undefined}>
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- a bigger target for the arrow button, which is the keyboard path */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- as above */}
      <div
        className="bookmark-compact-line"
        onClick={(event) => {
          // Every row opens: the edit and trash actions live in the open part
          if (!(event.target as HTMLElement).closest('a, button')) {
            setIsOpen((open) => !open)
          }
        }}
      >
        <span className="bookmark-compact-type">
          {type ? <TypeToIcon type={type} size={16} /> : null}
        </span>
        <RouterLink
          className="bookmark-compact-title"
          to={url ?? `/bookmark/${id}`}
          onClick={() => handleClickRegister(id)}
        >
          {url ? <Favicon url={url} size={16} /> : null}
          <span>{title || url || 'Untitled'}</span>
        </RouterLink>
        <span className="bookmark-compact-meta bookmark-compact-domain">
          {url ? simpleUrl(url) : null}
        </span>
        <span className="bookmark-compact-meta bookmark-compact-tags">
          {tags?.slice(0, VISIBLE_TAGS).map((tag) => (
            <Link key={tag} href={urlJoin('/tag', tag)} variant="accent">
              #{tag}
            </Link>
          ))}
          {hiddenTagCount > 0 ? <span>+{hiddenTagCount}</span> : null}
        </span>
        <time className="bookmark-compact-meta" dateTime={created_at}>
          {createdDate.short}
        </time>
        <span className="bookmark-compact-actions">
          <BookmarkToggles {...props} />
          <IconButton
            size="m"
            className="feed-icon-button bookmark-compact-caret"
            aria-expanded={isOpen}
            aria-controls={isOpen ? detailId : undefined}
            aria-label={isOpen ? 'Hide details' : 'Show details'}
            onClick={() => setIsOpen((open) => !open)}
          >
            <CaretDownIcon size={14} weight="bold" />
          </IconButton>
        </span>
      </div>
      {isOpen ? (
        <div className="bookmark-compact-detail" id={detailId}>
          <div className="bookmark-compact-detail-text">
            {description ? <Markdown preventClamping>{description}</Markdown> : null}
            {note ? (
              <div className="bookmark-compact-note">
                <NoteIcon size={14} weight="duotone" aria-label="Note" />
                <Markdown preventClamping>{note}</Markdown>
              </div>
            ) : null}
            <BookmarkActions {...props} showToggles={false} />
          </div>
          {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : null}
        </div>
      ) : null}
    </li>
  )
}
