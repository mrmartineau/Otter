import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Suspense } from 'react'
import title from 'title'
import { Feed } from '@/components/Feed'
import { Loader } from '@/components/Loader'
import { TypeToIcon } from '@/components/TypeToIcon'
import type { Bookmark, BookmarkType } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/type/$type')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Type: ${
          title ? title(decodeURIComponent(params.type)) : params.type
        }`,
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions({ ...opts.deps.search, type: opts.params.type })
    )
    return bookmarks
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function Page() {
  const type = Route.useParams().type
  const search = useSearch({ from: '/_app/type/$type' })
  // @ts-expect-error Fix `search` typings
  const { data } = useSuspenseQuery(getBookmarksOptions({ ...search, type }))

  return (
    <Suspense fallback={<Loader />}>
      <Feed
        items={data.data as Bookmark[]}
        count={data.count || 0}
        limit={search.limit}
        offset={search.offset}
        allowGroupByDate={true}
        title={title(type)}
        icon={<TypeToIcon size={24} type={type as BookmarkType} />}
        feedType="bookmarks"
        from={`/type/${type}`}
      />
    </Suspense>
  )
}
