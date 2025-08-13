import { StarIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { getBookmarks } from '@/utils/fetching/bookmarks'

export const Route = createFileRoute('/_app/stars')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('starsTitle'),
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search } }) => {
    const bookmarks = await getBookmarks({ ...search, star: true })
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
      title={CONTENT.starsTitle}
      icon={<StarIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      from={`/stars`}
    />
  )
}
