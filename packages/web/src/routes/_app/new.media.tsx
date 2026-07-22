import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { MediaForm } from '@/components/MediaForm'
import { createTitle } from '@/constants'
import type { MediaInsert } from '@/types/db'
import { getMediaOptions, useCreateMedia } from '@/utils/fetching/media'

export const Route = createFileRoute('/_app/new/media')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: createTitle('newMediaTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const media = await opts.context.queryClient.ensureQueryData(
      getMediaOptions(),
    )
    return media
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: mediaResponse } = useSuspenseQuery(getMediaOptions())
  const createMediaMutation = useCreateMedia()

  const platforms = useMemo(() => {
    const platformSet = new Set<string>()
    Object.values(mediaResponse?.data ?? {}).forEach((items) => {
      items.forEach((item) => {
        if (item.platform) {
          platformSet.add(item.platform)
        }
      })
    })
    return Array.from(platformSet).toSorted()
  }, [mediaResponse])

  const handleCreateMedia = (formData: MediaInsert) => {
    createMediaMutation.mutate(formData, {
      onSuccess: () => {
        navigate({ to: '/media' })
      },
    })
  }

  return (
    <MediaForm
      type="new"
      platforms={platforms}
      onFormSubmit={handleCreateMedia}
      isSubmitting={createMediaMutation.isPending}
    />
  )
}
