import { ArrowFatLinesUpIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/public')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: CONTENT.publicTitle,
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions({ ...opts.deps.search, public: true })
    )
    const response = { ...bookmarks }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function Page() {
  const search = useSearch({ from: '/_app/public' })
  const { data } = useSuspenseQuery(
    // @ts-expect-error Fix `search` typings
    getBookmarksOptions({ ...search, public: true })
  )

  return (
    <Feed
      items={data.data as Bookmark[]}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
      allowGroupByDate={true}
      title={CONTENT.publicTitle}
      icon={<ArrowFatLinesUpIcon weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  )
}
