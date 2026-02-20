import { useSortable } from '@dnd-kit/react/sortable'
import { PencilIcon, TrashIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import type { Media, MediaStatus } from '@/types/db'
import { cn } from '@/utils/classnames'
import { useDeleteMedia } from '@/utils/fetching/media'
import { Flex } from './Flex'
import { IconButton } from './IconButton'
import { Rating } from './Rating'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './Tooltip'
import { MediaTypeToIcon } from './TypeToIcon'

interface MediaCardProps extends ComponentProps<'div'> {
  media: Media
  onEdit?: (media: Media) => void
  status?: MediaStatus
}

export const MediaCard = ({
  media,
  className,
  onEdit,
  status,
  ...rest
}: MediaCardProps) => {
  const { ref, isDragging } = useSortable({
    accept: 'item',
    group: status,
    id: media.id,
    index: media.sort_order ?? 0,
    type: 'item',
  })
  // console.log(`🚀 ~ MediaCard ~ data:`, data.sortable.index, index, newIndex)
  // const index = data.sortable.index

  const deleteMedia = useDeleteMedia()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this media item?')) {
      deleteMedia.mutate(media.id)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        'card media-card cursor-grab active:cursor-grabbing',
        isDragging && 'media-card-dragging',
        className,
      )}
      {...rest}
      data-index={media.sort_order ?? 0}
      data-media-id={media.media_id}
    >
      {media.image ? (
        <img src={media.image} alt={media.name} className="rounded-md" />
      ) : (
        <div className="media-card-title">{media.name}</div>
      )}

      {media.rating ? <Rating rating={media.rating} /> : null}

      <TooltipProvider delayDuration={800} skipDelayDuration={500}>
        <div className="feed-item-footer">
          <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
            {media.type ? (
              <div className="shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MediaTypeToIcon
                      type={media.type}
                      size="16"
                      className="inline-block"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{media.type}</TooltipContent>
                </Tooltip>
              </div>
            ) : null}
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
