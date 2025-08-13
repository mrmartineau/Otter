import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { FeedSimple } from '@/components/FeedSimple'
import type { Bookmark, Toot } from '@/types/db'
import { getBookmarksOptions } from '@/utils/fetching/bookmarks'
import { getDashboardOptions } from '@/utils/fetching/dashboard'
import { getTootsOptions } from '@/utils/fetching/toots'
import { randomElements } from '@/utils/random-array-elements'
import { Loader } from '@/components/Loader'
import { createTitle } from '@/constants'

export const Route = createFileRoute('/_app/dashboard')({
  component: Index,
  head: () => ({
    meta: [
      {
        title: createTitle('dashboardTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const dashboard = await opts.context.queryClient.ensureQueryData(
      getDashboardOptions()
    )
    const followUpBookmarks = await opts.context.queryClient.ensureQueryData(
      getBookmarksOptions({
        limit: 4,
        status: 'active',
        tag: 'follow-up',
      })
    )
    const toots = await opts.context.queryClient.ensureQueryData(
      getTootsOptions({
        likes: true,
        params: {
          limit: 4,
        },
      })
    )
    const response = { dashboard, followUpBookmarks, toots }
    return response
  },
})

function Index() {
  const { data: dashboard } = useSuspenseQuery(getDashboardOptions())
  const { data: followUpBookmarks } = useSuspenseQuery(
    getBookmarksOptions({
      limit: 4,
      status: 'active',
      tag: 'follow-up',
    })
  )
  const { data: toots } = useSuspenseQuery(
    getTootsOptions({
      likes: true,
      params: {
        limit: 4,
      },
    })
  )

  return (
    <Suspense fallback={<Loader />}>
      <div className="flex flex-col gap-l">
        {dashboard?.recent?.length ? (
          <FeedSimple items={dashboard.recent} title="Recent" />
        ) : null}
        {dashboard?.oneWeekAgo?.length ? (
          <FeedSimple
            items={randomElements<Bookmark>(dashboard.oneWeekAgo, 2)}
            title="One week ago"
          />
        ) : null}
        {dashboard?.oneMonthAgo?.length ? (
          <FeedSimple
            items={randomElements<Bookmark>(dashboard.oneMonthAgo, 2)}
            title="One month ago"
          />
        ) : null}
        {dashboard?.twoMonthsAgo?.length ? (
          <FeedSimple
            items={randomElements<Bookmark>(dashboard.twoMonthsAgo, 2)}
            title="Two months ago"
          />
        ) : null}
        {dashboard?.sixMonthsAgo?.length ? (
          <FeedSimple
            items={randomElements<Bookmark>(dashboard.sixMonthsAgo, 2)}
            title="Six months ago"
          />
        ) : null}
        {dashboard?.oneYearAgo?.length ? (
          <FeedSimple
            items={randomElements<Bookmark>(dashboard.oneYearAgo, 2)}
            title="One year ago"
          />
        ) : null}
        {followUpBookmarks?.data?.length ? (
          <FeedSimple
            items={followUpBookmarks?.data as Bookmark[]}
            title="#follow-up"
          />
        ) : null}
        {toots?.data?.length ? (
          <FeedSimple items={toots.data as Toot[]} title="Liked toots" />
        ) : null}
      </div>
    </Suspense>
  )
}
