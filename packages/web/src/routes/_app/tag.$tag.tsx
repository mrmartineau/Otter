import { HashIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import type { Bookmark } from '@/types/db'
import { getBookmarks } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/tag/$tag')({
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: `Tag: #${decodeURIComponent(params.tag)}`,
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search }, params }) => {
    const bookmarks = await getBookmarks({ ...search, tag: params.tag })
    const response = { ...bookmarks, ...search, tag: params.tag }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  // @ts-expect-error How do I type useLoaderData?
  const { data, count, limit, offset, tag } = Route.useLoaderData()

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={tag}
      icon={<HashIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/tag/${tag}`}
    />
  )
}
