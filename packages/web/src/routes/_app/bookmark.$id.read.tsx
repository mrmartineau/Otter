import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import urlJoin from 'proper-url-join'
import { Flex } from '@/components/Flex'
import { Link } from '@/components/Link'
import { Markdown } from '@/components/Markdown'
import { getBookmark } from '@/utils/fetching/bookmarks'
import { simpleUrl } from '@/utils/simpleUrl'

interface ScrapeContentResult {
  title: string
  content: string
  author: string
  domain: string
}

const isScrapeContentResult = (
  value: unknown,
): value is ScrapeContentResult => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.domain === 'string'
  )
}

const getContentOptions = (url: string) =>
  queryOptions({
    queryFn: async (): Promise<ScrapeContentResult> => {
      const response = await fetch(
        urlJoin('/api/scrape-content', { query: { url } }),
      )
      const data = (await response.json()) as
        | ScrapeContentResult
        | { error?: string; message?: string }

      if (!response.ok) {
        const message =
          'error' in data && data.error
            ? data.error
            : 'message' in data && data.message
              ? data.message
              : `Request failed with status ${response.status}`
        throw new Error(message)
      }

      if ('error' in data && data.error) {
        throw new Error(data.error)
      }

      if (!isScrapeContentResult(data)) {
        throw new Error('Unexpected scrape-content response shape')
      }

      return data
    },
    queryKey: ['bookmark-content', url],
    staleTime: 60 * 1000,
  })

export const Route = createFileRoute('/_app/bookmark/$id/read')({
  component: RouteComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        // @ts-expect-error How do I type loader data?
        title: `Read: ${loaderData?.title}`,
      },
    ],
  }),
  loader: async ({ params, context }) => {
    const { data } = await getBookmark({ id: params.id })
    if (data?.url) {
      await context.queryClient.ensureQueryData(getContentOptions(data.url))
    }
    return { id: params.id, title: data?.title, url: data?.url }
  },
})

function RouteComponent() {
  // @ts-expect-error How do I type useLoaderData?
  const { id, title, url } = Route.useLoaderData()
  const { data: content } = useSuspenseQuery(getContentOptions(url!))

  return (
    <div className="card feed-item">
      <div className="feed-item-content">
        <Flex align="center" gap="2xs" wrap="wrap">
          <Link href={`/bookmark/${id}`} variant="subtle">
            <Flex align="center" gap="3xs">
              <ArrowLeftIcon size={14} />
              Back to bookmark
            </Flex>
          </Link>
          {url ? (
            <>
              <span className="text-theme11">·</span>
              <Link href={url} rel="external" variant="subtle">
                <Flex align="center" gap="3xs">
                  {simpleUrl(url)}
                  <ArrowSquareOutIcon size={14} />
                </Flex>
              </Link>
            </>
          ) : null}
        </Flex>

        {title ? <h1 className="mt-m text-step-2 font-bold">{title}</h1> : null}

        {content?.content ? (
          <Markdown preventClamping>{content.content}</Markdown>
        ) : (
          <p className="text-theme11">
            No readable content available for this page.
          </p>
        )}
      </div>
    </div>
  )
}
