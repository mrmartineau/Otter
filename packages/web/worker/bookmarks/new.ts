import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import pMap from 'p-map'
import { API_HEADERS } from '@/constants'
import type { Bookmark, BookmarkStatus, BookmarkType } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import type { MetaTag } from '@/utils/fetching/meta'
import { getScrapeData } from '@/utils/fetching/scrape'
import { getErrorMessage } from '@/utils/get-error-message'
import { matchTags } from '@/utils/matchTags'
import { bookmarks } from '../../db/schema'
import { type RequestContext, requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { bookmarkToRow } from './mapper'
import { scheduleBookmarkSideEffects } from './sideEffects'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type BookmarkInsert = typeof bookmarks.$inferInsert
type NewBookmark = Partial<Bookmark> & { scrape?: boolean }

const getTagMetadata = async (requestContext: RequestContext) => {
  const rows = await requestContext.db
    .select({ tags: bookmarks.tags })
    .from(bookmarks)
    .where(eq(bookmarks.user, requestContext.user?.id ?? ''))

  const counts = new Map<string, number>()

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([tag, count]) => ({
    count,
    tag,
  })) satisfies MetaTag[]
}

const toBookmarkInsert = (
  bookmark: Partial<Bookmark>,
  userId: string,
): BookmarkInsert => ({
  blueskyPostUri: bookmark.bluesky_post_uri,
  clickCount: bookmark.click_count,
  description: bookmark.description,
  feed: bookmark.feed,
  id: bookmark.id,
  image: bookmark.image,
  modifiedAt: bookmark.modified_at ? new Date(bookmark.modified_at) : undefined,
  note: bookmark.note,
  public: bookmark.public,
  star: bookmark.star,
  status: bookmark.status as BookmarkStatus | undefined,
  tags: bookmark.tags,
  title: bookmark.title,
  tweet: bookmark.tweet,
  type: bookmark.type as BookmarkType | undefined,
  url: bookmark.url,
  user: userId,
})

const getRequestContext = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context, [
    'bookmarks:write',
  ])

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

/**
 * POST /api/new
 * Adds new bookmarks using API-key or session auth.
 */
export const postNewBookmark = async (context: HonoContext) => {
  const requestBody = (await context.req.json()) as NewBookmark[]

  try {
    const auth = await getRequestContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const dbTags = await getTagMetadata(auth.requestContext)
    const mapper = async ({ scrape, url, ...rest }: NewBookmark) => {
      if (url && scrape) {
        const metadata = await getScrapeData(url)
        const tags = rest.tags || []

        return toBookmarkInsert(
          {
            ...rest,
            description: metadata.description,
            feed: metadata.feeds,
            image: metadata.image,
            tags: [...matchTags(metadata, dbTags), ...tags],
            title: metadata.title,
            type: metadata.urlType,
            url: metadata.cleaned_url || metadata.url,
          },
          auth.userId,
        )
      }

      return toBookmarkInsert({ url, ...rest }, auth.userId)
    }
    const payload = await pMap(requestBody, mapper, { concurrency: 2 })
    const data = await auth.requestContext.db
      .insert(bookmarks)
      .values(payload)
      .returning()
    const rows = data.map(bookmarkToRow)

    for (const row of rows) {
      scheduleBookmarkSideEffects(context, {
        record: row,
        type: 'INSERT',
      })
    }

    return new Response(JSON.stringify(rows), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem adding new bookmark',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}

/**
 * GET /api/new?url=https://example.com
 * Adds a scraped bookmark using API-key or session auth.
 */
export const getNewBookmark = async (context: HonoContext) => {
  const searchParams = new URL(context.req.url).searchParams
  const url = searchParams.get('url')

  if (!url) {
    return errorResponse({
      reason: 'Please provide a url parameter',
      status: 400,
    })
  }

  try {
    const auth = await getRequestContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const dbTags = await getTagMetadata(auth.requestContext)
    const metadata = await getScrapeData(url)
    const data = await auth.requestContext.db
      .insert(bookmarks)
      .values([
        toBookmarkInsert(
          {
            description: metadata.description,
            feed: metadata.feeds,
            image: metadata.image,
            tags: matchTags(metadata, dbTags),
            title: metadata.title,
            type: metadata.urlType,
            url: metadata.cleaned_url || metadata.url,
          },
          auth.userId,
        ),
      ])
      .returning()
    const rows = data.map(bookmarkToRow)

    for (const row of rows) {
      scheduleBookmarkSideEffects(context, {
        record: row,
        type: 'INSERT',
      })
    }

    return new Response(JSON.stringify(rows), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return errorResponse({
      error: errorMessage,
      reason: 'Problem adding new bookmark',
      status: 400,
    })
  }
}
