import { TrashIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/trash')({
  component: FeedPage,
  head: () => ({
    meta: [
      {
        title: createTitle('trashTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions({ ...opts.deps.search, status: 'inactive' })
    )
    return bookmarks
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function FeedPage() {
  const search = useSearch({ from: '/_app/trash' })
  const { data } = useSuspenseQuery(
    // @ts-expect-error Fix `search` typings
    getBookmarksOptions({ ...search, status: 'inactive' })
  )
  return (
    <Feed
      items={data.data as Bookmark[]}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
      allowGroupByDate={true}
      title={CONTENT.trashTitle}
      icon={<TrashIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      allowDeletion
      from={`/trash`}
    />
  )
}
