import { createFileRoute } from '@tanstack/react-router'
import title from 'title'
import { Feed } from '@/components/Feed'
import { TypeToIcon } from '@/components/TypeToIcon'
import type { Bookmark, BookmarkType } from '@/types/db'
import { getBookmarks } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/type/$type')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Type: ${
          title ? title(decodeURIComponent(params.type)) : params.type
        }`,
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search }, params }) => {
    const bookmarks = await getBookmarks({ ...search, type: params.type })
    const response = { ...bookmarks, ...search, type: params.type }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  // @ts-expect-error How do I type useLoaderData?
  const { data, count, limit, offset, type } = Route.useLoaderData()

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={title(type)}
      icon={<TypeToIcon size={24} type={type as BookmarkType} />}
      feedType="bookmarks"
      from={`/type/${type}`}
    />
  )
}
