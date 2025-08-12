import {
  createFileRoute,
  // type RegisteredRouter,
  // type RouteById,
} from '@tanstack/react-router'
import { BookmarkForm } from '@/components/BookmarkForm'
// import type { BaseBookmark } from '@/types/db'
import { getBookmark } from '@/utils/fetching/bookmarks'
import { Loader } from '@/components/Loader'
import { Suspense } from 'react'

/* type LoaderData = {
  bookmark: BaseBookmark
  id: string
} */

/* type LoaderData = RouteById<
  RegisteredRouter['routeTree'],
  '/_app/bookmark/$id/edit'
>['types']['loaderData'] */

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
