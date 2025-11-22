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
        // @ts-expect-error How do I type loader data?
        title: `Bookmark: ${loaderData?.title}`,
      },
    ],
  }),
  loader: async (opts) => {
    const bookmark = await opts.context.queryClient.ensureQueryData(
      getBookmarkOptions({
        id: opts.params.id,
      })
    )
    return bookmark.data
  },
})

function RouteComponent() {
  const { data: bookmark } = useSuspenseQuery(
    getBookmarkOptions({ id: Route.useParams().id })
  )
  const matchRoute = useMatchRoute()
  const params = matchRoute({ to: '/bookmark/$id/edit' })

  // this feels weird, but it's a workaround to get the edit page to work
  // the edit page is a child route, so it needs to be rendered here through the use of `Outlet`
  return (
    <>
      {params ? (
        <Outlet />
      ) : (
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          {/* @ts-expect-error How do I get the proper types for this? */}
          <BookmarkFeedItem {...bookmark.data} preventMarkdownClamping />
        </ErrorBoundary>
      )}
    </>
  )
}
