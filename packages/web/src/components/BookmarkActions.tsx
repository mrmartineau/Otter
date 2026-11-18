import { ArticleIcon, CopyIcon, EyeIcon, StarIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useToggleBookmarkState } from '@/hooks/useToggleBookmarkState'
import type { BookmarkFeedItemProps } from './BookmarkFeedItem'
import { FeedItemActions } from './FeedItemActions'
import { IconButton, iconButtonVariants } from './IconButton'
import { Link } from './Link'

/** Star and public buttons, used by the compact and card views. */
export const BookmarkToggles = (props: BookmarkFeedItemProps) => {
  const { star, public: isPublic, allowDeletion = false } = props
  const handleToggleState = useToggleBookmarkState(props)

  if (allowDeletion) {
    return null
  }

  return (
    <>
      <IconButton
        size="m"
        className="feed-icon-button"
        aria-pressed={star}
        aria-label={star ? 'Unstar' : 'Star'}
        title={star ? 'Unstar' : 'Star'}
        onClick={() => handleToggleState('star')}
      >
        <StarIcon size={16} weight={star ? 'fill' : 'duotone'} />
      </IconButton>
      <IconButton
        size="m"
        className="feed-icon-button"
        aria-pressed={isPublic}
        aria-label={isPublic ? 'Make private' : 'Make public'}
        title={isPublic ? 'Make private' : 'Make public'}
        onClick={() => handleToggleState('public')}
      >
        <EyeIcon size={16} weight={isPublic ? 'fill' : 'duotone'} />
      </IconButton>
    </>
  )
}

interface BookmarkActionsProps extends BookmarkFeedItemProps {
  showToggles?: boolean
}

/** The action row for the compact and card views: toggles, copy, read and the ⋯ menu. */
export const BookmarkActions = ({
  showToggles = true,
  ...props
}: BookmarkActionsProps) => {
  const { id, url } = props

  const handleCopyUrl = async () => {
    if (!url) {
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied to clipboard')
    } catch {
      toast.error('Could not copy the URL')
    }
  }

  return (
    <div className="bookmark-actions">
      {showToggles ? <BookmarkToggles {...props} /> : null}
      {/* Copy and read both need a URL; the reader scrapes it */}
      {url ? (
        <>
          <IconButton
            size="m"
            className="feed-icon-button"
            aria-label="Copy URL to clipboard"
            title="Copy URL"
            onClick={handleCopyUrl}
          >
            <CopyIcon size={16} weight="duotone" />
          </IconButton>
          <Link
            href={`/bookmark/${id}/read`}
            className={iconButtonVariants({
              className: 'feed-icon-button',
              size: 'm',
            })}
            aria-label="Read article"
            title="Read article"
          >
            <ArticleIcon size={16} weight="duotone" />
          </Link>
        </>
      ) : null}
      <FeedItemActions {...props} />
    </div>
  )
}
