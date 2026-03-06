import { ClockIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { PublicBookmarkItem } from '@/components/PublicBookmarkItem'
import { CONTENT } from '@/constants'
import type { Bookmark } from '@/types/db'
import { cn } from '@/utils/classnames'
import { getRecentPublicBookmarksOptions } from '@/utils/fetching/recentPublicBookmarks'

const RECENT_LIMIT = 50

export const Route = createFileRoute('/recent')({
  component: RecentPage,
  head: () => ({
    meta: [{ title: `Recent — ${CONTENT.appName}` }],
  }),
  loader: async (opts) => {
    return opts.context.queryClient.ensureQueryData(
      getRecentPublicBookmarksOptions(opts.deps?.search),
    )
  },
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => ({
    limit: Number(search.limit) || RECENT_LIMIT,
    offset: Number(search.offset) || 0,
  }),
})

function RecentPage() {
  const { limit, offset } = Route.useSearch()
  const { data } = useSuspenseQuery(
    getRecentPublicBookmarksOptions({ limit, offset }),
  )

  const count = data.count ?? 0
  const hasNewItems = offset > 0
  const hasOldItems = offset + limit < count

  return (
    <Container className="py-l">
      <div className="feed">
        <Flex gap="xs" justify="between" align="center">
          <h3
            className={cn(
              headingVariants({ variant: 'feedTitle' }),
              'flex items-center gap-2xs',
            )}
          >
            <ClockIcon weight="fill" size={24} />
            Recent
          </h3>
        </Flex>

        <div className="mt-m grid gap-m">
          {data.data?.length ? (
            data.data.map((item: Bookmark) => (
              <PublicBookmarkItem {...item} key={item.id} />
            ))
          ) : (
            <div>{CONTENT.noItems}</div>
          )}
        </div>

        {hasOldItems || hasNewItems ? (
          <Flex align="center" justify="center" gap="s" className="mt-m">
            {hasNewItems ? (
              <Button asChild>
                <a
                  href={`/recent?limit=${limit}&offset=${Math.max(0, offset - limit)}`}
                >
                  {CONTENT.newerBtn}
                </a>
              </Button>
            ) : null}
            {hasOldItems ? (
              <Button asChild>
                <a href={`/recent?limit=${limit}&offset=${offset + limit}`}>
                  {CONTENT.olderBtn}
                </a>
              </Button>
            ) : null}
          </Flex>
        ) : null}
      </div>
    </Container>
  )
}
