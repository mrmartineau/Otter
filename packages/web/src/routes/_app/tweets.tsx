import { TwitterLogoIcon } from '@phosphor-icons/react'
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getMetaOptions } from '@/utils/fetching/meta'
import { getTweetsInfiniteOptions } from '@/utils/fetching/tweets'

export const Route = createFileRoute('/_app/tweets')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('tweetsTitle'),
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return {
      ...params,
      liked: (search.liked as boolean) ?? false,
    }
  },
})

function Page() {
  const { liked, ...search } = useSearch({ from: '/_app/tweets' })
  const { data: dbMeta } = useSuspenseQuery(getMetaOptions())
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      getTweetsInfiniteOptions({ likes: liked ?? false, params: search }),
    )

  const items = data.pages.flatMap((page) => page.data ?? [])
  const count = data.pages[0]?.count ?? 0

  const subNav = [
    {
      href: '/tweets?liked=false',
      isActive: !liked,
      text: dbMeta?.tweets ? `My Tweets (${dbMeta?.tweets})` : 'My Tweets',
    },
  ]

  if (dbMeta?.likedTweets && dbMeta.likedTweets > 0) {
    subNav.push({
      href: '/tweets?liked=true',
      isActive: liked,
      text: dbMeta.likedTweets
        ? `My Liked Tweets (${dbMeta.likedTweets})`
        : 'My Liked Tweets',
    })
  }

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={CONTENT.tweetsTitle}
      icon={
        <TwitterLogoIcon aria-label="My tweets" size={24} weight="duotone" />
      }
      feedType="tweets"
      subNav={subNav}
      showFeedOptions={false}
      from="/tweets"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
