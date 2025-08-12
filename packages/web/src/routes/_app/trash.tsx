import { TrashIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { getBookmarks } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/trash')({
  component: FeedPage,
  // validateSearch: (search: Record<string, unknown>): ApiParametersQuery => {
  //   return {
  //     filter: (search.filter as string) || '',
  //     page: Number(search?.page ?? 1),
  //     sort: (search.sort as ProductSearchSortOptions) || 'newest',
  //   }
  // },
  head: () => ({
    meta: [
      {
        title: 'Feed',
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search } }) => {
    const bookmarks = await getBookmarks({ ...search, status: 'inactive' })
    const response = { ...bookmarks, ...search }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function FeedPage() {
  const { data, count, limit, offset } = Route.useLoaderData()

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.trashTitle}
      icon={<TrashIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      allowDeletion
      from={`/trash`}
    />
  )
}
