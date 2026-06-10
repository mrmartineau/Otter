import { CollisionPriority } from '@dnd-kit/abstract'
import { useDroppable } from '@dnd-kit/react'
import { PlusIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import titleFmt from 'title'
import type { Media, MediaStatus } from '@/types/db'
import { cn } from '@/utils/classnames'
import { IconButton } from './IconButton'
import { MediaCard } from './MediaCard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './Tooltip'

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'wishlist':
      return 'bg-blue-400'
    case 'now':
      return 'bg-green-400'
    case 'done':
      return 'bg-purple-400'
    default:
      return 'bg-gray-400'
  }
}

interface MediaColumnProps extends ComponentProps<'div'> {
  status: MediaStatus
  media: Media[]
  title: string
  onEdit?: (media: Media) => void
  onAdd?: (status: MediaStatus) => void
}

export const MediaColumn = ({
  status,
  media,
  title,
  className,
  onEdit,
  onAdd,
  ...rest
}: MediaColumnProps) => {
  const { isDropTarget, ref } = useDroppable({
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
    id: status,
    type: 'column',
  })

  return (
    <div
      ref={ref}
      className={cn(
        'media-column',
        isDropTarget && 'media-column-drop-target',
        className,
      )}
      {...rest}
    >
      <div className="media-column-header">
        <span
          className={cn(
            'size-2.5 rounded-full shrink-0',
            getStatusDotColor(status),
          )}
        />
        <h3 className="font-semibold">{titleFmt(title)}</h3>
        <span className="media-column-count">{media.length}</span>
        {onAdd ? (
          <TooltipProvider delayDuration={800}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  size="s"
                  className="ml-auto"
                  onClick={() => onAdd(status)}
                  aria-label={`Add item to ${title}`}
                >
                  <PlusIcon size={16} weight="duotone" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Add item to {titleFmt(title)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <div className="media-column-items">
        {media.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            onEdit={onEdit}
            status={status}
          />
        ))}

        {media.length === 0 ? (
          <div className="media-column-empty">
            Nothing here yet — drag an item over
            {onAdd ? ' or hit the + above' : ''}
          </div>
        ) : null}
      </div>
    </div>
  )
}
