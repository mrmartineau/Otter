import { HashIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/tag/$tag')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Tag: #${decodeURIComponent(params.tag)}`,
      },
    ],
  }),

  loader: async (opts) => {
    const bookmarks = await opts.context.queryClient.ensureQueryData(
      // @ts-expect-error Why is `search` not typed properly?
      getBookmarksOptions({ ...opts.deps.search, tag: opts.params.tag })
    )
    return bookmarks
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return apiParameters(search)
  },
})

function Page() {
  const tag = Route.useParams().tag
  const search = useSearch({ from: '/_app/tag/$tag' })
  // @ts-expect-error Fix `search` typings
  const { data } = useSuspenseQuery(getBookmarksOptions({ ...search, tag }))

  return (
    <Feed
      items={data.data as Bookmark[]}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
      allowGroupByDate={true}
      title={tag}
      icon={<HashIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/tag/${tag}`}
    />
  )
}
