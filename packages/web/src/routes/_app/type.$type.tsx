import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import title from 'title'
import { Feed } from '@/components/Feed'
import { TypeToIcon } from '@/components/TypeToIcon'
import type { Bookmark, BookmarkType } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksInfiniteOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/type/$type')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Type: ${title ? title(params.type) : params.type}`,
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return params
  },
})

function Page() {
  const type = Route.useParams().type
  const search = useSearch({ from: '/_app/type/$type' })
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(getBookmarksInfiniteOptions({ ...search, type }))

  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={title(type)}
      icon={<TypeToIcon size={24} type={type as BookmarkType} />}
      feedType="bookmarks"
      from={`/type/${type}`}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
