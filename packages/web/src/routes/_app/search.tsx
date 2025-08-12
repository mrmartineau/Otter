import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { getSearchBookmarksOptions } from '@/utils/fetching/search'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Loader } from '@/components/Loader'

export const Route = createFileRoute('/_app/search')({
  component: RouteComponent,
  // @ts-expect-error How do I type search params?
  head: ({ search }) => ({
    meta: [
      {
        title: `${CONTENT.searchTitle}: ${decodeURIComponent(search?.q || '')}`,
      },
    ],
  }),
  loader: async (opts) => {
    // @ts-expect-error Fix `search` typings
    const { q, ...search } = opts.deps.search
    const { data } = await opts.context.queryClient.ensureQueryData(
      getSearchBookmarksOptions({ searchTerm: q, params: search })
    )
    console.log(`🚀 ~ data:`, data)
    return data
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      ...apiParameters(search),
      q: search.q as string,
    }
  },
})

function RouteComponent() {
  const { q, ...search } = useSearch({ from: '/_app/search' })
  const { data } = useSuspenseQuery(
    // @ts-expect-error Fix `search` typings
    getSearchBookmarksOptions({ searchTerm: q, params: search })
  )

  return (
    <Suspense fallback={<Loader />}>
      <Feed
        items={data.data as Bookmark[]}
        count={data.count || 0}
        limit={search.limit}
        offset={search.offset}
        allowGroupByDate={true}
        title={`${CONTENT.searchTitle}: ${q}`}
        icon={<MagnifyingGlassIcon weight="duotone" size={24} />}
        feedType="bookmarks"
        from={`/search?q=${q}`}
      />
    </Suspense>
  )
}
