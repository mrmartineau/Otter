import { FolderIcon, HashIcon } from '@phosphor-icons/react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { Link } from '@/components/Link'
import { Loader } from '@/components/Loader'
import { PublicBookmarkItem } from '@/components/PublicBookmarkItem'
import { CONTENT } from '@/constants'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import type { Bookmark } from '@/types/db'
import { cn } from '@/utils/classnames'
import { getPublicShareInfiniteOptions } from '@/utils/fetching/shares'

export const Route = createFileRoute('/share/$token')({
  component: SharePage,
  head: ({ params }) => ({
    meta: [
      { title: `Shared — ${CONTENT.appName} (${params.token.slice(0, 8)})` },
    ],
  }),
  loader: async ({ context, params }) => {
    return context.queryClient.ensureInfiniteQueryData(
      getPublicShareInfiniteOptions(params.token),
    )
  },
})

function SharePage() {
  const { token } = Route.useParams()
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(getPublicShareInfiniteOptions(token))

  const firstPage = data.pages[0]
  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const ownerLabel =
    firstPage.owner.username ?? firstPage.owner.name ?? 'someone'

  const { sentinelRef } = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  })

  const icon =
    firstPage.kind === 'collection' ? (
      <FolderIcon weight="duotone" size={24} />
    ) : (
      <HashIcon weight="duotone" size={24} />
    )

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-theme1 px-s p-xs">
        <Link href="/" className="flex items-center gap-2xs">
          <img src="/otter-logo.svg" width="33" height="33" alt="Otter logo" />
          <span className={headingVariants({ variant: 'feedTitle' })}>
            Otter
          </span>
        </Link>
        <p className="text-step--1 text-theme10">
          Otter is a bookmarking app for saving, organising, and sharing links,
          articles, and media.
        </p>
      </header>
      <Container className="pt-m">
        <div className="feed">
          <Flex gap="xs" direction="column">
            <h3
              className={cn(
                headingVariants({ variant: 'feedTitle' }),
                'flex items-center gap-2xs',
              )}
            >
              {icon}
              {firstPage.name}
            </h3>
            <p className="text-step--1 text-theme10">
              Shared by {ownerLabel} · {firstPage.count}{' '}
              {firstPage.count === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          </Flex>

          <div className="mt-m grid gap-m">
            {items.length ? (
              items.map((item) => (
                <PublicBookmarkItem {...item} key={item.id} />
              ))
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>

          <div ref={sentinelRef} className="mt-m flex justify-center">
            {isFetchingNextPage ? <Loader /> : null}
          </div>
        </div>
      </Container>
    </>
  )
}
