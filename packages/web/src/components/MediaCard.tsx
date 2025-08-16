import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PencilIcon, TrashIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import type { Media } from '@/types/db'
import { cn } from '@/utils/classnames'
import { useDeleteMedia } from '@/utils/fetching/media'
import { Flex } from './Flex'
import { IconButton } from './IconButton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './Tooltip'
import { MediaTypeToIcon } from './TypeToIcon'

const getRatingDisplay = (rating: string | null) => {
  if (!rating) return null
  return '⭐'.repeat(Math.floor(parseFloat(rating)))
}

interface MediaCardProps extends ComponentProps<'div'> {
  media: Media
  onEdit?: (media: Media) => void
}
function always() {
  return true
}

export const MediaCard = ({
  media,
  className,
  onEdit,
  ...rest
}: MediaCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    data,
    index,
    newIndex,
  } = useSortable({ animateLayoutChanges: always, id: media.id })
  // console.log(`🚀 ~ MediaCard ~ data:`, data.sortable.index, index, newIndex)
  // const index = data.sortable.index

  const deleteMedia = useDeleteMedia()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this media item?')) {
      deleteMedia.mutate(media.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'card media-card cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        className
      )}
      {...attributes}
      {...listeners}
      {...rest}
      data-index={index}
    >
      <div className="media-card-title">{media.name}</div>

      {media.rating ? (
        <div className="text-xs text-yellow-500">
          {getRatingDisplay(media.rating)}
        </div>
      ) : null}

      {media.media_id ? (
        <div className="text-xs text-gray-500 dark:text-gray-500">
          ID: {media.media_id}
        </div>
      ) : null}

      <TooltipProvider delayDuration={800} skipDelayDuration={500}>
        <div className="feed-item-footer">
          <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
            <div className="shrink-0">
              <MediaTypeToIcon
                type={media.type ?? 'other'}
                size="16"
                className="inline-block"
              />{' '}
              {media.type ?? 'other'}
            </div>
            {media.platform ? <div>{media.platform}</div> : null}
            {onEdit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(media)
                    }}
                    size="s"
                  >
                    <PencilIcon size={16} weight="duotone" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Edit this item</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  onClick={handleDelete}
                  size="s"
                  disabled={deleteMedia.isPending}
                >
                  <TrashIcon size={16} weight="duotone" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Delete this item</TooltipContent>
            </Tooltip>
          </Flex>
        </div>
      </TooltipProvider>
    </div>
  )
}
