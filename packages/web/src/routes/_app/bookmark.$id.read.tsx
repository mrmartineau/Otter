import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import urlJoin from 'proper-url-join'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Flex } from '@/components/Flex'
import { Link } from '@/components/Link'
import { Loader } from '@/components/Loader'
import { Markdown } from '@/components/Markdown'
import { getBookmark } from '@/utils/fetching/bookmarks'
import { simpleUrl } from '@/utils/simpleUrl'
import type { AiGenerateResponse } from '../../../worker/ai/generateResponse'

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

const getSummaryOptions = (content: string) =>
  queryOptions({
    enabled: false,
    queryFn: async (): Promise<string> => {
      const response = await fetch('/api/ai/summarise', {
        body: JSON.stringify({ prompt: content }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Summary request failed with status ${response.status}`)
      }
      const data = (await response.json()) as AiGenerateResponse
      return data.response
    },
    queryKey: ['bookmark-summary', content],
    staleTime: 5 * 60 * 1000,
  })

type ViewMode = 'read' | 'summary'

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
  const [viewMode, setViewMode] = useState<ViewMode>('read')

  const summaryQuery = useQuery({
    ...getSummaryOptions(content?.content ?? ''),
    enabled: viewMode === 'summary' && !!content?.content,
  })

  const hasContent = !!content?.content

  return (
    <div className="card feed-item">
      <div className="feed-item-content">
        <Flex
          align="center"
          gap="2xs"
          wrap="wrap"
          className="bookmark-read-links"
        >
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

        {hasContent ? (
          <div
            className="mt-s flex rounded-full border border-theme4 bg-theme2 p-3xs gap-2xs"
            role="tablist"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={viewMode === 'read'}
              onClick={() => setViewMode('read')}
              variant={viewMode === 'read' ? 'default' : 'ghost'}
              className={`rounded-full grow`}
              >
              Read
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={viewMode === 'summary'}
              onClick={() => setViewMode('summary')}
              variant={viewMode === 'summary' ? 'default' : 'ghost'}
              className={`rounded-full grow`}
            >
              Summary
            </Button>
          </div>
        ) : null}

        {title ? <h1 className="my-m text-step-2 font-bold">{title}</h1> : null}

        {viewMode === 'read' ? (
          hasContent ? (
            <Markdown preventClamping textSize={0}>
              {content.content}
            </Markdown>
          ) : (
            <p className="text-theme11">
              No readable content available for this page.
            </p>
          )
        ) : (
          <>
            {summaryQuery.isLoading ? (
              <Flex align="center" gap="2xs" className="mt-m">
                <Loader />
                <span className="text-theme11">Generating summary…</span>
              </Flex>
            ) : summaryQuery.error ? (
              <p className="text-theme11 mt-m">
                Failed to generate summary. Please try again.
              </p>
            ) : summaryQuery.data ? (
              <Markdown preventClamping textSize={0}>
                {summaryQuery.data}
              </Markdown>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
