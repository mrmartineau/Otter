import { StarIcon } from '@phosphor-icons/react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksInfiniteOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/stars')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('starsTitle'),
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
  const search = useSearch({ from: '/_app/stars' })
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      // @ts-expect-error Fix `search` typings
      getBookmarksInfiniteOptions({ ...search, star: true }),
    )

  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={CONTENT.starsTitle}
      icon={<StarIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from="/stars"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
