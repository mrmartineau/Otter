import { createFileRoute, useSearch } from '@tanstack/react-router'
import { BookmarkForm } from '@/components/BookmarkForm'
import { getMetaOptions } from '@/utils/fetching/meta'
import { createTitle } from '@/constants'

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
  const { tags } = Route.useLoaderData()
  const searchParams = useSearch({ from: '/_app/new/bookmark' })
  return (
    <BookmarkForm
      type="new"
      initialValues={{
        url: searchParams.url,
      }}
      tags={tags?.tags}
    />
  )
}
