import { NoteIcon, PlayIcon } from '@phosphor-icons/react'
import urlJoin from 'proper-url-join'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { useClickBookmark } from '@/hooks/useClickBookmark'
import { getRelativeDate } from '@/utils/dates'
import { fullPath } from '@/utils/fullPath'
import { getCardShape } from '@/utils/getCardShape'
import { simpleUrl } from '@/utils/simpleUrl'
import { BookmarkActions } from './BookmarkActions'
import type { BookmarkFeedItemProps } from './BookmarkFeedItem'
import { Favicon } from './Favicon'
import { Link } from './Link'
import { TypeToIcon } from './TypeToIcon'

const VISIBLE_TAGS = 4
// Only the first screenful staggers in; later cards would wait too long
const MAX_STAGGER = 12

interface BookmarkCardProps extends BookmarkFeedItemProps {
  index?: number
}

/** A card in the cards view. The bookmark's type picks its layout. */
export const BookmarkCard = ({ index = 0, ...props }: BookmarkCardProps) => {
  const { id, title, url, description, note, image, type } = props
  const handleClickRegister = useClickBookmark()
  const shape = getCardShape(props)
  const href = url ?? `/bookmark/${id}`
  const imageUrl = image && url ? fullPath(url, image) : null
  const displayTitle = title || (url ? simpleUrl(url) : 'Untitled')
  const style = { '--i': Math.min(index, MAX_STAGGER) } as CSSProperties
  const onClick = () => handleClickRegister(id)

  const titleLink = (
    <a href={href} className="bookmark-card-title" onClick={onClick}>
      {displayTitle}
    </a>
  )
  const media = (ratio: string, overlay?: ReactNode) => (
    <a href={href} className="bookmark-card-media" onClick={onClick}>
      <Cover {...props} imageUrl={imageUrl} ratio={ratio} />
      {overlay}
    </a>
  )

  let body: ReactNode
  switch (shape) {
    case 'note':
      body = (
        <>
          {title ? <h4 className="bookmark-card-note-title">{title}</h4> : null}
          <p className="bookmark-card-note-text">{note || description}</p>
        </>
      )
      break
    case 'picture':
      body = media(
        '4 / 5',
        <span className="bookmark-card-overlay">{displayTitle}</span>,
      )
      break
    case 'video':
      body = (
        <>
          {media(
            '16 / 9',
            <span className="bookmark-card-play">
              <PlayIcon size={18} weight="fill" aria-label="Video" />
            </span>,
          )}
          {titleLink}
        </>
      )
      break
    case 'audio':
      body = (
        <div className="bookmark-card-audio">
          <Cover {...props} imageUrl={imageUrl} ratio="1 / 1" />
          {titleLink}
        </div>
      )
      break
    case 'object':
      body = (
        <>
          {media(
            '1 / 1',
            <span className="bookmark-card-badge">
              {type ? <TypeToIcon type={type} size={14} /> : null}
              {type}
            </span>,
          )}
          {titleLink}
        </>
      )
      break
    default:
      body = (
        <>
          {titleLink}
          {description ? (
            <p className="bookmark-card-description">{description}</p>
          ) : null}
          {imageUrl ? (
            <img
              className="bookmark-card-thumb"
              src={imageUrl}
              alt=""
              loading="lazy"
            />
          ) : null}
          {note ? (
            <p className="bookmark-card-inline-note">
              <NoteIcon size={14} weight="duotone" aria-label="Note" /> {note}
            </p>
          ) : null}
        </>
      )
  }

  return (
    <article className="bookmark-card" data-shape={shape} style={style}>
      {body}
      <BookmarkCardFooter {...props} />
    </article>
  )
}

const Cover = ({
  imageUrl,
  ratio,
  type,
  url,
}: BookmarkFeedItemProps & { imageUrl: string | null; ratio: string }) => {
  const [isBroken, setIsBroken] = useState(false)

  return (
    <div className="bookmark-card-cover" style={{ aspectRatio: ratio }}>
      {imageUrl && !isBroken ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setIsBroken(true)}
        />
      ) : (
        <div className="bookmark-card-cover-empty">
          {type ? <TypeToIcon type={type} size={40} /> : null}
          <span>{url ? simpleUrl(url) : null}</span>
        </div>
      )}
    </div>
  )
}

const BookmarkCardFooter = (props: BookmarkFeedItemProps) => {
  const { tags, url, created_at } = props
  const createdDate = getRelativeDate(created_at)
  const hiddenTagCount = (tags?.length ?? 0) - VISIBLE_TAGS

  return (
    <footer className="bookmark-card-footer">
      {tags?.length ? (
        <div className="bookmark-card-tags">
          {tags.slice(0, VISIBLE_TAGS).map((tag) => (
            <Link key={tag} href={urlJoin('/tag', tag)}>
              {tag}
            </Link>
          ))}
          {hiddenTagCount > 0 ? <span>+{hiddenTagCount}</span> : null}
        </div>
      ) : null}
      <div className="bookmark-card-meta">
        {url ? <Favicon url={url} size={16} /> : null}
        <span className="bookmark-card-domain">
          {url ? simpleUrl(url) : 'note'}
        </span>
        <time dateTime={created_at}>
          {createdDate.ago < 8 ? createdDate.relative : createdDate.formatted}
        </time>
      </div>
      <BookmarkActions {...props} />
    </footer>
  )
}
