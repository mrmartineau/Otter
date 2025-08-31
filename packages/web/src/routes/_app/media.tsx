import { move } from '@dnd-kit/helpers'
import { DragDropProvider, KeyboardSensor, PointerSensor } from '@dnd-kit/react'
import { CircleIcon, PlusCircleIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/Dialog'
import { IconControl } from '@/components/IconControl'
import { Input } from '@/components/Input'
import { MediaColumn } from '@/components/MediaColumn'
import { MediaForm } from '@/components/MediaForm'
import { MediaTypeToIcon } from '@/components/TypeToIcon'
import { createTitle } from '@/constants'
import type {
  Media,
  MediaFilters,
  MediaInsert,
  MediaStatus,
  MediaUpdate,
} from '@/types/db'
import {
  getMediaOptions,
  useCreateMedia,
  useUpdateMedia,
  useUpdateMediaStatus,
} from '@/utils/fetching/media'

const columns = [
  { status: 'wishlist' as const, title: 'Wishlist' },
  { status: 'now' as const, title: 'Now' },
  { status: 'done' as const, title: 'Done' },
]

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const { data: mediaResponse } = useSuspenseQuery(getMediaOptions())
  const allMedia = mediaResponse?.data
  const [media, setMedia] = useState(allMedia)
  const previousItems = useRef(media)
  const createMediaMutation = useCreateMedia()
  const updateMediaMutation = useUpdateMedia()
  const updateMediaStatusMutation = useUpdateMediaStatus()

  useEffect(() => {
    if (allMedia) {
      setMedia(allMedia)
    }
  }, [allMedia])

  // Filter media based on search and type filters
  const filteredMedia = useMemo(() => {
    const result = {} as typeof media

    Object.entries(media).forEach(([status, items]) => {
      result[status as keyof typeof media] = items.filter((item) => {
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase()
          const matchesSearch =
            item.name?.toLowerCase().includes(searchTerm) ||
            item.platform?.toLowerCase().includes(searchTerm) ||
            item.type?.toLowerCase().includes(searchTerm)

          if (!matchesSearch) {
            return false
          }
        }

        // Type filter
        if (filters.type && item.type !== filters.type) {
          return false
        }

        return true
      })
    })

    return result
  }, [media, filters])

  const handleCreateMedia = (formData: MediaInsert) => {
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

  const handleUpdateMedia = (formData: MediaUpdate) => {
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

  // Get unique platforms for the form
  const platforms = useMemo(() => {
    const platformSet = new Set<string>()
    Object.values(media).forEach((item) => {
      item.forEach((item) => {
        if (item.platform) {
          platformSet.add(item.platform)
        }
      })
    })
    return Array.from(platformSet).toSorted()
  }, [media])

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
                <PlusCircleIcon size={18} weight="duotone" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent placement="center" width="m">
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

      <div className="overflow-x-auto w-full">
        <DragDropProvider
          onDragStart={() => {
            previousItems.current = media
          }}
          onDragOver={(event) => {
            setMedia((items) => move(items, event))
          }}
          onDragEnd={(event) => {
            const { source } = event.operation
            if (!source) {
              return
            }

            if (event.canceled) {
              if (source.type === 'item') {
                setMedia(previousItems.current)
              }

              return
            }

            // Determine which columns changed compared to the snapshot from drag start
            const prev = previousItems.current || {}
            const next = media || {}

            const statuses = new Set([
              ...Object.keys(prev ?? {}),
              ...Object.keys(next ?? {}),
            ]) as Set<keyof typeof next>

            const batched: Array<{
              id: number
              status: MediaStatus
              sortOrder: number
            }> = []

            statuses.forEach((statusKey) => {
              const prevIds = (prev[statusKey] ?? []).map((i) => i.id)
              const nextItems = next[statusKey] ?? []
              const nextIds = nextItems.map((i) => i.id)

              const changed =
                prevIds.length !== nextIds.length ||
                prevIds.some((id, idx) => id !== nextIds[idx])

              if (!changed) return

              nextItems.forEach((item, index) => {
                batched.push({
                  id: item.id,
                  sortOrder: index,
                  status: statusKey as MediaStatus,
                })
              })
            })

            if (batched.length > 0) {
              updateMediaStatusMutation.mutate(batched)
            }
          }}
          sensors={[PointerSensor, KeyboardSensor]}
          // https://next.dndkit.com/extend/plugins
          // plugins={[AutoScroller, Accessibility]}
        >
          <div className="media-columns min-w-0">
            {columns.map(({ status, title }) => (
              <MediaColumn
                key={status}
                status={status}
                title={title}
                media={filteredMedia[status]}
                onEdit={handleEditMedia}
              />
            ))}
          </div>
        </DragDropProvider>
      </div>
    </div>
  )
}
