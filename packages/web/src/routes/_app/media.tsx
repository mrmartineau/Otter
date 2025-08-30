import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CircleIcon, PlusIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/Dialog'
import { IconControl } from '@/components/IconControl'
import { Input } from '@/components/Input'
import { MediaCard } from '@/components/MediaCard'
import { MediaColumn } from '@/components/MediaColumn'
import { MediaForm } from '@/components/MediaForm'
import { MediaTypeToIcon } from '@/components/TypeToIcon'
import { createTitle } from '@/constants'
import type { Media, MediaFilters } from '@/types/db'
import {
  getMediaOptions,
  useCreateMedia,
  useUpdateMedia,
  useUpdateMediaStatus,
} from '@/utils/fetching/media'

export const Route = createFileRoute('/_app/media')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: createTitle('mediaTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const media = await opts.context.queryClient.ensureQueryData(
      getMediaOptions()
    )
    return media
  },
})

function RouteComponent() {
  const [filters, setFilters] = useState<MediaFilters>({})
  const [activeId, setActiveId] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor)
    // useSensor(KeyboardSensor, {
    //   coordinateGetter,
    // })
  )

  const { data: mediaResponse } = useSuspenseQuery(getMediaOptions())
  const allMedia = mediaResponse?.data || []

  const createMediaMutation = useCreateMedia()
  const updateMediaMutation = useUpdateMedia()
  const updateMediaStatusMutation = useUpdateMediaStatus()

  // Filter media based on search and type filters
  const filteredMedia = useMemo(() => {
    return allMedia.filter((item) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          item.name?.toLowerCase().includes(searchTerm) ||
          item.platform?.toLowerCase().includes(searchTerm) ||
          item.type?.toLowerCase().includes(searchTerm)

        if (!matchesSearch) return false
      }

      // Type filter
      if (filters.type && item.type !== filters.type) {
        return false
      }

      return true
    })
  }, [allMedia, filters])

  // Group media by status
  const mediaByStatus = useMemo(() => {
    const grouped = {
      done: [] as Media[],
      now: [] as Media[],
      skipped: [] as Media[],
      wishlist: [] as Media[],
    }

    filteredMedia.forEach((item) => {
      const status = item.status || 'wishlist'
      if (grouped[status as keyof typeof grouped]) {
        grouped[status as keyof typeof grouped].push(item)
      }
    })

    return grouped
  }, [filteredMedia])

  const activeMedia = useMemo(() => {
    return filteredMedia.find((item) => item.id === activeId)
  }, [activeId, filteredMedia])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, collisions } = event
    console.log(`🚀 ~ handleDragEnd:`, collisions)
    setActiveId(null)

    // https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx
    // if (active.id in media && over?.id) {
    //   setContainers((containers) => {
    //     const activeIndex = containers.indexOf(active.id)
    //     const overIndex = containers.indexOf(over.id)

    //     return arrayMove(containers, activeIndex, overIndex)
    //   })
    // }
    // arrayMove()

    if (!over) {
      return
    }

    const activeId = active.id as number
    const overId = over.id as string

    // Find the media item being dragged
    const activeMedia = allMedia.find((item) => item.id === activeId)
    if (!activeMedia) {
      return
    }

    return

    // If dropping on a status column
    /* if (['wishlist', 'now', 'skipped', 'done'].includes(overId)) {
      const newStatus = overId as Database['public']['Enums']['media_status']

      if (activeMedia.status !== newStatus) {
        updateMediaStatusMutation.mutate({
          id: activeId,
          // sortOrder:,
          status: newStatus,
        })
      }
    } */
  }

  const handleCreateMedia = (formData: any) => {
    createMediaMutation.mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false)
      },
    })
  }

  const handleEditMedia = (media: Media) => {
    setEditingMedia(media)
    setIsDialogOpen(true)
  }

  const handleUpdateMedia = (formData: any) => {
    if (!editingMedia) {
      return
    }

    updateMediaMutation.mutate(
      {
        data: formData,
        id: editingMedia.id,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false)
          setEditingMedia(null)
        },
      }
    )
  }

  const columns = [
    { status: 'wishlist' as const, title: 'Wishlist' },
    { status: 'now' as const, title: 'Now' },
    { status: 'done' as const, title: 'Done' },
  ]

  // Get unique platforms for the form
  const platforms = useMemo(() => {
    const platformSet = new Set<string>()
    allMedia.forEach((item) => {
      if (item.platform) {
        platformSet.add(item.platform)
      }
    })
    return Array.from(platformSet).sort()
  }, [allMedia])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4 justify-between flex-wrap">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, platform, or type..."
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <IconControl
                type="checkbox"
                value=""
                label="All"
                name="types"
                onChange={() =>
                  setFilters({
                    ...filters,
                    type: undefined,
                  })
                }
                checked={!filters.type}
              >
                <CircleIcon size={18} weight="duotone" />
              </IconControl>
              {(
                [
                  'tv',
                  'film',
                  'game',
                  'book',
                  'podcast',
                  'music',
                  'other',
                ] as const
              ).map((type) => (
                <IconControl
                  key={type}
                  type="radio"
                  value={type}
                  label={type}
                  name="types"
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      type: e.currentTarget.checked ? type : undefined,
                    })
                  }
                  checked={filters.type === type}
                >
                  <MediaTypeToIcon type={type} />
                </IconControl>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingMedia(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusIcon size={18} weight="bold" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent placement="right" width="l">
              <MediaForm
                type={editingMedia ? 'edit' : 'new'}
                initialValues={editingMedia || undefined}
                platforms={platforms}
                onFormSubmit={
                  editingMedia ? handleUpdateMedia : handleCreateMedia
                }
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-scroll w-full">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          <div className="media-columns min-w-0">
            {columns.map(({ status, title }) => (
              <MediaColumn
                key={status}
                status={status}
                title={title}
                media={mediaByStatus[status]}
                onEdit={handleEditMedia}
              />
            ))}
          </div>
          <DragOverlay>
            {activeMedia ? <MediaCard media={activeMedia} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
