import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, notFound, useSearch } from '@tanstack/react-router'
import { Feed } from '@/components/Feed'
import { PlatformIcon } from '@/components/PlatformIcon'
import { createTitle } from '@/constants'
import { isPlatformId, PLATFORMS } from '@/platforms/catalog'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { getPlatformItemsInfiniteOptions } from '@/utils/fetching/platforms'

export const Route = createFileRoute('/_app/platform/$platform')({
  beforeLoad: ({ params }) => {
    if (!isPlatformId(params.platform)) {
      throw notFound()
    }
  },
  component: Page,
  head: ({ params }) => ({
    meta: [
      {
        title: createTitle(
          isPlatformId(params.platform)
            ? PLATFORMS[params.platform].title
            : 'Platform',
        ),
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return params
  },
})

function Page() {
  const { platform } = Route.useParams()
  const search = useSearch({ from: '/_app/platform/$platform' })
  const definition = isPlatformId(platform) ? PLATFORMS[platform] : null
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      getPlatformItemsInfiniteOptions({
        params: search,
        platform: isPlatformId(platform) ? platform : 'bluesky',
      }),
    )

  const items = data.pages.flatMap((page) => page.data ?? [])
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={definition?.title ?? platform}
      icon={
        <PlatformIcon
          platform={platform}
          aria-label={definition?.title ?? platform}
          size={24}
        />
      }
      feedType="platformItems"
      showFeedOptions={false}
      from="/platform/$platform"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
