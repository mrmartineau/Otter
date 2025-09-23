import { FolderIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { useCollectionsSubNav } from '@/hooks/useCollectionsSubNav'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getCollectionsOptions } from '@/utils/fetching/collections'

export const Route = createFileRoute('/_app/collection/$collection')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Collection: ${decodeURIComponent(params.collection)}`,
      },
    ],
  }),
  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      getCollectionsOptions({
        name: opts.params.collection,
        // @ts-expect-error Fix `search` typings
        params: opts.deps.search,
      }),
    )
    return bookmarks
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function Page() {
  const collection = Route.useParams().collection
  const search = useSearch({ from: '/_app/collection/$collection' })
  const { data } = useSuspenseQuery(
    getCollectionsOptions({
      name: collection,
      // @ts-expect-error Fix `search` typings
      params: search,
    }),
  )
  const subNav = useCollectionsSubNav(collection)

  return (
    <Feed
      items={data.data as Bookmark[]}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
      allowGroupByDate={true}
      title={collection}
      icon={<FolderIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      subNav={subNav}
      from={`/collection/${collection}`}
    />
  )
}
