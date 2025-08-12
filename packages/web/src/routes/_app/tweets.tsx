import { TwitterLogoIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import { getMetaOptions } from '@/utils/fetching/meta'
import { getTweets } from '@/utils/fetching/tweets'

export const Route = createFileRoute('/_app/tweets')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: CONTENT.starsTitle,
      },
    ],
  }),
  // @ts-expect-error How do I type useLoaderData?
  loader: async ({ deps: { search } }) => {
    const { data } = await getTweets({
      ...search,
      likes: search?.liked ?? false,
    })
    const response = { tweets: data, ...search }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  const { tweets, count, limit, offset, liked } = Route.useLoaderData()
  const { data: dbMeta } = useQuery(getMetaOptions())

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
      items={tweets}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.tweetsTitle}
      icon={
        <TwitterLogoIcon aria-label="My tweets" size={24} weight="duotone" />
      }
      feedType="tweets"
      subNav={subNav}
      showFeedOptions={false}
      from={`/tweets`}
    />
  )
}
