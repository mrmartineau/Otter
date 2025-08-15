import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { BookmarkForm } from '@/components/BookmarkForm'
import { Loader } from '@/components/Loader'
import { getBookmark } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/bookmark/$id/edit')({
  component: RouteComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        // @ts-expect-error How do I type useLoaderData?
        title: `Bookmark: ${loaderData?.bookmark?.title}`,
      },
    ],
  }),
  loader: async ({ params }) => {
    const { data } = await getBookmark({
      id: params.id,
    })
    return { bookmark: data, id: params.id }
  },
})

function RouteComponent() {
  // @ts-expect-error How do I type useLoaderData?
  const { bookmark, id } = Route.useLoaderData()

  return (
    <Suspense fallback={<Loader />}>
      <BookmarkForm
        type="edit"
        initialValues={{
          description: bookmark?.description,
          image: bookmark?.image,
          note: bookmark?.note,
          star: bookmark?.star,
          tags: bookmark?.tags,
          title: bookmark?.title,
          type: bookmark?.type,
          url: bookmark?.url,
        }}
        id={id}
      />
    </Suspense>
  )
}
