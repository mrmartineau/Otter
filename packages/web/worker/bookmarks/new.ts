import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import pMap from 'p-map'
import { API_HEADERS } from '@/constants'
import type { Bookmark, BookmarkStatus, BookmarkType } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import type { MetaTag } from '@/utils/fetching/meta'
import { getErrorMessage } from '@/utils/get-error-message'
import { matchTags } from '@/utils/matchTags'
import { bookmarks } from '../../db/schema'
import { classifyBookmark } from '../ai/classify'
import { type RequestContext, requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { scrapeMetadata } from '../scraper/index'
import { linkType } from '../scraper/link-type'
import { bookmarkToRow } from './mapper'
import { scheduleBookmarkSideEffects } from './sideEffects'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type BookmarkInsert = typeof bookmarks.$inferInsert
type NewBookmark = Partial<Bookmark> & { scrape?: boolean }

/** Cap for the fallback tagger; the classifier caps itself. */
const MAX_AUTO_TAGS = 5

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
 * Tags and types a page with the classifier.
 *
 * The AI is the tagger now. `matchTags` is only the fallback for when the AI
 * call fails, because a bookmark with a few thin tags beats a save that errors.
 */
const autoClassify = async (
  context: HonoContext,
  fields: {
    title?: string | null
    description?: string | null
    note?: string | null
    url: string
    type?: BookmarkType | null
  },
  dbTags: MetaTag[],
) => {
  // `like:` tags mirror favourites on other services, so they are never ours to
  // suggest. The classifier wants the rest most-used first.
  const existingTags = dbTags
    .filter(
      (item) =>
        item.tag && item.tag !== 'Untagged' && !item.tag.startsWith('like:'),
    )
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map((item) => item.tag as string)

  try {
    const result = await classifyBookmark({
      context,
      currentType: fields.type ?? 'link',
      description: fields.description ?? '',
      existingTags,
      title: fields.title ?? '',
      url: fields.url,
    })

    return { tags: result.tags.map((tag) => tag.name), type: result.type }
  } catch (error) {
    console.warn(`Classify failed for ${fields.url}: ${getErrorMessage(error)}`)

    return {
      tags: matchTags(
        {
          description: fields.description ?? undefined,
          note: fields.note ?? undefined,
          title: fields.title ?? undefined,
        },
        dbTags,
      ).slice(0, MAX_AUTO_TAGS),
      type: fields.type ?? undefined,
    }
  }
}

/**
 * Builds the bookmark fields for a URL, scraping the page for details.
 *
 * A scrape can fail for reasons that have nothing to do with the user: plenty
 * of sites sit behind a bot wall and answer a server-side fetch with 403, and
 * others time out. Losing the whole save in that case costs the user the part
 * they actually asked for, so the bookmark is still written with whatever the
 * caller supplied plus a type guessed from the URL.
 */
export const scrapedBookmark = async (
  url: string,
  rest: Partial<Bookmark>,
  dbTags: MetaTag[],
  context: HonoContext,
): Promise<Partial<Bookmark>> => {
  const tags = rest.tags ?? []

  try {
    const metadata = await scrapeMetadata(url)
    const auto = await autoClassify(
      context,
      {
        description: metadata.description ?? rest.description,
        note: rest.note,
        title: metadata.title ?? rest.title,
        type: metadata.urlType,
        url: metadata.cleaned_url || metadata.url || url,
      },
      dbTags,
    )

    return {
      ...rest,
      description: metadata.description ?? rest.description,
      feed: metadata.feeds,
      image: metadata.image ?? rest.image,
      tags: [...new Set([...auto.tags, ...tags])],
      title: metadata.title ?? rest.title,
      type: auto.type ?? metadata.urlType,
      url: metadata.cleaned_url || metadata.url,
    }
  } catch (error) {
    console.warn(`Scrape failed for ${url}: ${getErrorMessage(error)}`)

    const fallbackType = (rest.type as BookmarkType) ?? linkType(url, false)
    const auto = await autoClassify(
      context,
      { ...rest, type: fallbackType, url },
      dbTags,
    )

    return {
      ...rest,
      tags: [...new Set([...auto.tags, ...tags])],
      type: auto.type ?? fallbackType,
      url,
    }
  }
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
        return toBookmarkInsert(
          await scrapedBookmark(url, rest, dbTags, context),
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
    const data = await auth.requestContext.db
      .insert(bookmarks)
      .values([
        toBookmarkInsert(
          await scrapedBookmark(url, {}, dbTags, context),
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
