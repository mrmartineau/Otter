import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Suspense } from 'react'
import { BookmarkForm } from '@/components/BookmarkForm'
import { Loader } from '@/components/Loader'
import { createTitle } from '@/constants'
import { getMetaOptions } from '@/utils/fetching/meta'

export const Route = createFileRoute('/_app/new/bookmark')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: createTitle('newBookmarkTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const tags = await opts.context.queryClient.ensureQueryData(
      getMetaOptions()
    )
    const response = { tags }
    return response
  },
  loaderDeps: ({ search }) => ({ url: search.url }),
  validateSearch: (search: { url?: string }): { url?: string } => {
    return {
      url: search.url,
    }
  },
})

function RouteComponent() {
  const searchParams = useSearch({ from: '/_app/new/bookmark' })
  const { data } = useSuspenseQuery(getMetaOptions())
  return (
    <Suspense fallback={<Loader />}>
      <BookmarkForm
        type="new"
        initialValues={{
          url: searchParams.url,
        }}
        tags={data?.tags}
      />
    </Suspense>
  )
}
