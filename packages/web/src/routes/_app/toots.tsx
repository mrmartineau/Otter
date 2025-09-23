import { MastodonLogoIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getMetaOptions } from '@/utils/fetching/meta'
import { getTootsOptions } from '@/utils/fetching/toots'

export const Route = createFileRoute('/_app/toots')({
  component: Page,
  head: () => ({
    meta: [
      {
        title: createTitle('tootsTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    // @ts-expect-error Fix `search` typings
    const { liked, ...search } = opts.deps.search
    const toots = await opts.context.queryClient.ensureQueryData(
      getTootsOptions({ likes: liked, params: search }),
    )
    return toots
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      ...apiParameters(search),
      liked: search.liked as boolean,
    }
  },
})

function Page() {
  const { liked, ...search } = useSearch({ from: '/_app/toots' })
  const { data: dbMeta } = useSuspenseQuery(getMetaOptions())
  const { data } = useSuspenseQuery(
    getTootsOptions({ likes: liked, params: search }),
  )

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
      items={data.data}
      count={data.count || 0}
      limit={search.limit}
      offset={search.offset}
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
