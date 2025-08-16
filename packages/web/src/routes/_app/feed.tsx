import { ListBulletsIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { FullLoader } from '@/components/Loader'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/feed')({
  component: FeedPage,
  head: () => ({
    meta: [
      {
        title: createTitle('feedTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions(opts.deps.search)
    )
    const response = { ...bookmarks }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
  pendingComponent: () => <FullLoader />,
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function FeedPage() {
  const search = useSearch({ from: '/_app/feed' })
  // @ts-expect-error Fix `search` typings
  const { data } = useSuspenseQuery(getBookmarksOptions(search))

  return (
    <Feed
      items={data.data as Bookmark[]}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
      allowGroupByDate={true}
      title={CONTENT.feedTitle}
      icon={<ListBulletsIcon weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  )
}
