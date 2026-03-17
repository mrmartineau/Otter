import { ListBulletsIcon } from '@phosphor-icons/react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { FullLoader } from '@/components/Loader'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksInfiniteOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/feed')({
  component: FeedPage,
  head: () => ({
    meta: [
      {
        title: createTitle('feedTitle'),
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  pendingComponent: () => <FullLoader />,
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return params
  },
})

function FeedPage() {
  const search = useSearch({ from: '/_app/feed' })
  // @ts-expect-error Fix `search` typings
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(getBookmarksInfiniteOptions(search))

  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={CONTENT.feedTitle}
      icon={<ListBulletsIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
