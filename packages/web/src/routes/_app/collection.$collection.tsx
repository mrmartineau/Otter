import { FolderIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { useCollectionsSubNav } from '@/hooks/useCollectionsSubNav'
import type { Bookmark } from '@/types/db'
import { getCollections } from '@/utils/fetching/collections'

export const Route = createFileRoute('/_app/collection/$collection')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Collection: ${decodeURIComponent(params.collection)}`,
      },
    ],
  }),
  loader: async ({
    // @ts-expect-error How do I type search params?
    deps: { search },
    params,
  }): Promise<{
    data: Bookmark[]
    count: number
    limit: number
    offset: number
    collection: string
  }> => {
    const bookmarks = await getCollections({
      name: params.collection,
      params: {
        ...search,
      },
    })
    const response = { ...bookmarks, ...search, collection: params.collection }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  // @ts-expect-error How do I type useLoaderData?
  const { data, count, limit, offset, collection } = Route.useLoaderData()
  const subNav = useCollectionsSubNav(collection)

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={collection}
      icon={<FolderIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      subNav={subNav}
    />
  )
}
