import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ComponentProps } from 'react'
import titleFmt from 'title'
import type { Media } from '@/types/db'
import type { Database } from '@/types/supabase'
import { cn } from '@/utils/classnames'
import { MediaCard } from './MediaCard'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'wishlist':
      return 'border-blue-200 text-blue-200'
    case 'now':
      return 'border-green-200 text-green-200'
    case 'skipped':
      return 'border-yellow-200 text-yellow-200'
    case 'done':
      return 'border-purple-200 text-purple-200'
    default:
      return 'border-gray-200 text-gray-200'
  }
}

interface MediaColumnProps extends ComponentProps<'div'> {
  status: Database['public']['Enums']['media_status']
  media: Media[]
  title: string
  onEdit?: (media: Media) => void
}

export const MediaColumn = ({
  status,
  media,
  title,
  className,
  onEdit,
  ...rest
}: MediaColumnProps) => {
  const { setNodeRef, isOver, over, active } = useDroppable({
    id: status,
  })

  const isOverContainer = status === over?.id

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'media-column flex flex-col gap-4 h-full min-h-[500px]',
        className
      )}
      {...rest}
    >
      <div className={cn('column-header p-4 border-b', getStatusColor(status))}>
        <h3 className="font-semibold">{titleFmt(title)}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {media.length} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SortableContext
          items={media.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn('space-y-3', { 'bg-red-400': isOverContainer })}>
            {media.map((item) => (
              <MediaCard key={item.id} media={item} onEdit={onEdit} />
            ))}
          </div>
        </SortableContext>

        {media.length === 0 ? (
          <div className="text-center text-base py-8">
            No items in this column
          </div>
        ) : null}
      </div>
    </div>
  )
}
