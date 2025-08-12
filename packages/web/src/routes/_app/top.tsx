import { ArrowFatLinesUpIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { getBookmarks } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/top')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: 'Top links',
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search } }) => {
    const bookmarks = await getBookmarks({ ...search, top: true })
    const response = { ...bookmarks, ...search }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  const { data, count, limit, offset } = Route.useLoaderData()

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.topLinksTitle}
      icon={<ArrowFatLinesUpIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/top`}
    />
  )
}
