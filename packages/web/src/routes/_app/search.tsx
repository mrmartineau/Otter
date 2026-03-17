import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getSearchBookmarksInfiniteOptions } from '@/utils/fetching/search'

export const Route = createFileRoute('/_app/search')({
  component: RouteComponent,
  // @ts-expect-error How do I type search params?
  head: ({ search }) => ({
    meta: [
      {
        title: `${CONTENT.searchTitle}: ${search?.q || ''}`,
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return {
      ...params,
      q: search.q as string,
    }
  },
})

function RouteComponent() {
  const { q, ...search } = useSearch({ from: '/_app/search' })
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      // @ts-expect-error Fix `search` typings
      getSearchBookmarksInfiniteOptions({ params: search, searchTerm: q }),
    )

  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={`${CONTENT.searchTitle}: ${q}`}
      icon={<MagnifyingGlassIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/search?q=${encodeURIComponent(q)}`}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
