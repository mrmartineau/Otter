import { MastodonLogoIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT } from '@/constants'
import { getMetaOptions } from '@/utils/fetching/meta'
import { getToots } from '@/utils/fetching/toots'

export const Route = createFileRoute('/_app/toots')({
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
    const { data } = await getToots({
      ...search,
      likes: search?.liked ?? false,
    })
    const response = { toots: data, ...search }
    return response
  },
  loaderDeps: ({ search }) => ({ search }),
})

function Page() {
  const { toots, count, limit, offset, liked } = Route.useLoaderData()
  const { data: dbMeta } = useQuery(getMetaOptions())

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
      items={toots}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.tootsTitle}
      icon={<MastodonLogoIcon size={24} />}
      feedType="toots"
      subNav={subNav}
      showFeedOptions={false}
      from={`/toots`}
    />
  )
}
