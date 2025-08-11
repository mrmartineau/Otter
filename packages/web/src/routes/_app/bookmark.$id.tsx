import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { BookmarkFeedItem } from '@/components/BookmarkFeedItem'
import { getBookmark } from '@/utils/fetching/bookmarks'

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
  /* loader: async ({ params }: Promise<{
    data: PostgrestResponseSuccess<
      Database['public']['Tables']['bookmarks']['Row']
    >
  }>) => { */
  loader: async ({ params }) => {
    const { data } = await getBookmark({
      id: params.id,
    })
    return data
  },
})

function RouteComponent() {
  const bookmark = Route.useLoaderData()
  const matchRoute = useMatchRoute()
  const params = matchRoute({ to: '/bookmark/$id/edit' })

  // this feels weird, but it's a workaround to get the edit page to work
  // the edit page is a child route, so it needs to be rendered here through the use of `Outlet`
  return (
    <>
      {params ? (
        <Outlet />
      ) : (
        // @ts-expect-error How do I get the proper types for this?
        <BookmarkFeedItem {...bookmark} preventMarkdownClamping />
      )}
    </>
  )
}
