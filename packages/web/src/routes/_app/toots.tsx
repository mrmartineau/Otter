import { MastodonLogoIcon } from '@phosphor-icons/react'
import { useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getMetaOptions } from '@/utils/fetching/meta'
import { getTootsInfiniteOptions } from '@/utils/fetching/toots'

export const Route = createFileRoute('/_app/toots')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('tootsTitle'),
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return {
      ...params,
      liked: search.liked as boolean,
    }
  },
})

function Page() {
  const { liked, ...search } = useSearch({ from: '/_app/toots' })
  const { data: dbMeta } = useSuspenseQuery(getMetaOptions())
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      getTootsInfiniteOptions({ likes: liked, params: search }),
    )

  const items = data.pages.flatMap((page) => page.data ?? [])
  const count = data.pages[0]?.count ?? 0

  const subNav = [
    {
      href: '/toots?liked=false',
      isActive: !liked,
      text: dbMeta?.toots ? `My Toots (${dbMeta?.toots})` : 'My Toots',
    },
  ]

  if (dbMeta?.likedToots && dbMeta.likedToots > 0) {
    subNav.push({
      href: '/toots?liked=true',
      isActive: liked,
      text: dbMeta.likedToots
        ? `My Liked Toots (${dbMeta.likedToots})`
        : 'My Liked Toots',
    })
  }

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={CONTENT.tootsTitle}
      icon={<MastodonLogoIcon size={24} />}
      feedType="toots"
      subNav={subNav}
      showFeedOptions={false}
      from="/toots"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
