import { CheckCircleIcon, HashIcon, XCircleIcon } from '@phosphor-icons/react'
import type { MetaTag } from '@/utils/fetching/meta'

import { IconButton } from '../IconButton'
import { SidebarLink } from '../SidebarLink'
import { useUser } from '../UserProvider'

interface PinUnpinTagProps {
  tag: string
  pinned: boolean
}

const PinUnpinTag = ({ tag, pinned }: PinUnpinTagProps) => {
  const { handleUpdateUISettings } = useUser()

  const handleTogglePinnedTag = () => {
    if (pinned) {
      handleUpdateUISettings({
        payload: tag,
        type: 'pinnedTagRemove',
      })
    } else {
      handleUpdateUISettings({ payload: tag, type: 'pinnedTagAdd' })
    }
  }
  return (
    <IconButton
      variant="taglist"
      size="s"
      onClick={handleTogglePinnedTag}
      className="pinButton"
    >
      {pinned ? (
        <XCircleIcon aria-label="pin" weight="duotone" size={18} />
      ) : (
        <CheckCircleIcon aria-label="pin" weight="duotone" size={18} />
      )}
    </IconButton>
  )
}

interface TagListItemProps extends MetaTag {
  pinned: boolean
}

export const TagListItem = ({ tag, count, pinned }: TagListItemProps) => {
  return (
    <div className="tagListItem">
      <SidebarLink
        href={`/tag/${encodeURIComponent(tag)}`}
        count={count || 0}
        activePath={`/tag/${encodeURIComponent(tag)}`}
      >
        {pinned ? (
          <CheckCircleIcon aria-label="Pinned" size={18} weight="fill" />
        ) : (
          <HashIcon aria-label="tag" size={18} weight="duotone" />
        )}
        {tag}
      </SidebarLink>
      {tag ? <PinUnpinTag pinned={pinned} tag={tag} /> : null}
    </div>
  )
}
