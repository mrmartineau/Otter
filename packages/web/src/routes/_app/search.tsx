import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { getSearchBookmarks } from '@/utils/fetching/search'

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
  loader: async ({
    // @ts-expect-error How do I type useLoaderData?
    deps: { search },
  }): Promise<{
    data: Bookmark[]
    count: number
    limit: number
    offset: number
    q: string
  }> => {
    const { data } = await getSearchBookmarks({
      params: {
        ...search,
      },
      searchTerm: search.q,
    })
    const response = { bookmarks: data, ...search }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function RouteComponent() {
  // @ts-expect-error How do I type useLoaderData?
  const { bookmarks, count, limit, offset, q } = Route.useLoaderData()

  return (
    <Feed
      items={bookmarks as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={`${CONTENT.searchTitle}: ${q}`}
      icon={<MagnifyingGlassIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/search?q=${q}`}
    />
  )
}
