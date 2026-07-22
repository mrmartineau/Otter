import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { BookmarkFeedItem } from '@/components/BookmarkFeedItem'
import { getBookmarkOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/bookmark/$id')({
  component: RouteComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Bookmark: ${(loaderData as { title?: string } | undefined)?.title ?? ''}`,
      },
    ],
  }),
  loader: async (opts) => {
    const bookmark = await opts.context.queryClient.ensureQueryData(
      getBookmarkOptions({
        id: opts.params.id,
      }),
    )
    return bookmark.data
  },
  validateSearch: (search: {
    bookmarklet?: string
  }): { bookmarklet?: string } => {
    return {
      bookmarklet: search.bookmarklet,
    }
  },
})

function RouteComponent() {
  const { data: bookmark } = useSuspenseQuery(
    getBookmarkOptions({ id: Route.useParams().id }),
  )
  const matchRoute = useMatchRoute()
  const isChildRoute =
    matchRoute({ to: '/bookmark/$id/edit' }) ||
    matchRoute({ to: '/bookmark/$id/read' })

  return (
    <>
      {isChildRoute ? (
        <Outlet />
      ) : (
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          <BookmarkFeedItem {...bookmark.data} preventMarkdownClamping />
        </ErrorBoundary>
      )}
    </>
  )
}
