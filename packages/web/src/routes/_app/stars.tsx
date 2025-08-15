import { StarIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Feed } from '@/components/Feed'
import { Loader } from '@/components/Loader'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/stars')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('starsTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions({ ...opts.deps.search, star: true })
    )
    return bookmarks
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function Page() {
  const search = useSearch({ from: '/_app/stars' })
  const { data } = useSuspenseQuery(
    // @ts-expect-error Fix `search` typings
    getBookmarksOptions({ ...search, star: true })
  )

  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <Suspense fallback={<Loader />}>
        <Feed
          items={data.data as Bookmark[]}
          count={data.count || 0}
          limit={search.limit}
          offset={search.offset}
          allowGroupByDate={true}
          title={CONTENT.starsTitle}
          icon={<StarIcon weight="duotone" size={24} />}
          feedType="bookmarks"
          from={`/stars`}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
