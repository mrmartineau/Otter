import { and, desc, eq, gt, inArray, isNull, notInArray } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import type { Highlight, ReadingItem, ReadingState } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import type { Db } from '../../db/client'
import { bookmarks, highlights, readingItems } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { assertSafePublicUrl } from '../url-guard'
import { xtract } from '../xtractr/index'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type ReadingRow = typeof readingItems.$inferSelect
type BookmarkRow = typeof bookmarks.$inferSelect
type HighlightRow = typeof highlights.$inferSelect

const READING_STATES: ReadingState[] = [
  'pending',
  'ready',
  'failed',
  'archived',
]

const WORDS_PER_MINUTE = 200

export const readingTimeSeconds = (wordCount: number) =>
  Math.round((wordCount / WORDS_PER_MINUTE) * 60)

/** Progress only moves forward: a stale device must not rewind a fresher one. */
export const toReadingPatch = (
  current: Pick<ReadingRow, 'progress' | 'state'>,
  body: Record<string, unknown>,
) => {
  const patch: Partial<typeof readingItems.$inferInsert> = {}

  if (typeof body.progress === 'number') {
    patch.progress = Math.min(1, Math.max(current.progress, body.progress))
    patch.lastReadAt = new Date()
  }
  if (typeof body.last_position === 'string' || body.last_position === null) {
    patch.lastPosition = body.last_position as string | null
  }
  if (typeof body.state === 'string') {
    if (!READING_STATES.includes(body.state as ReadingState)) {
      throw new Error(`Unknown state: ${body.state}`)
    }
    patch.state = body.state as ReadingState
  }

  return patch
}

const idParam = (context: HonoContext) => context.req.param('id') ?? ''

const ok = (data: unknown, status = 200, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ data, error: null, ...extra }), {
    headers: API_HEADERS,
    status,
  })

const getAuthed = async (context: HonoContext, scopes: string[]) => {
  const requestContext = await requireRequestContext(context, scopes)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { db: requestContext.db, userId }
}

const highlightToRow = (row: HighlightRow): Highlight => ({
  color: row.color,
  created_at: row.createdAt.toISOString(),
  deleted_at: row.deletedAt?.toISOString() ?? null,
  exact: row.exact,
  id: row.id,
  note: row.note,
  prefix: row.prefix,
  reading_item_id: row.readingItemId,
  suffix: row.suffix,
  updated_at: row.updatedAt.toISOString(),
})

const itemToRow = (
  item: ReadingRow,
  bookmark: BookmarkRow,
  withContent = false,
): ReadingItem => ({
  author: item.author,
  bookmark_id: item.bookmarkId,
  content_hash: item.contentHash,
  ...(withContent ? { content_md: item.contentMd } : {}),
  created_at: item.createdAt.toISOString(),
  deleted_at: item.deletedAt?.toISOString() ?? null,
  description: bookmark.description,
  id: item.id,
  image: bookmark.image,
  last_position: item.lastPosition,
  last_read_at: item.lastReadAt?.toISOString() ?? null,
  progress: item.progress,
  published_at: item.publishedAt,
  reading_time_s: item.readingTimeS,
  site_name: item.siteName,
  star: bookmark.star,
  state: item.state,
  tags: bookmark.tags,
  title: bookmark.title,
  updated_at: item.updatedAt.toISOString(),
  url: bookmark.url,
  word_count: item.wordCount,
})

const findItem = async (db: Db, id: string, userId: string) => {
  const [found] = await db
    .select({ bookmark: bookmarks, item: readingItems })
    .from(readingItems)
    .innerJoin(bookmarks, eq(bookmarks.id, readingItems.bookmarkId))
    .where(and(eq(readingItems.id, id), eq(readingItems.userId, userId)))
    .limit(1)

  return found ?? null
}

const sha256 = async (text: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

/**
 * Runs the static extraction tier and stores the result. Failures are stored
 * honestly as `failed`, never hidden.
 *
 * ponytail: runs inline before the response (1–3s). Move to waitUntil with
 * its own DB client if the share sheet feels slow.
 */
const extractInto = async (
  db: Db,
  item: ReadingRow,
  bookmark: BookmarkRow,
): Promise<{ bookmark: BookmarkRow; item: ReadingRow }> => {
  try {
    const result = await xtract(bookmark.url ?? '')
    const contentMd = result.content || null
    const wordCount = result.wordCount || 0

    const [updatedItem] = await db
      .update(readingItems)
      .set({
        author: result.author || null,
        contentHash: contentMd ? await sha256(contentMd) : null,
        contentMd,
        publishedAt: result.published || null,
        readingTimeS: readingTimeSeconds(wordCount),
        siteName: result.site || result.domain || null,
        state: contentMd ? 'ready' : 'failed',
        updatedAt: new Date(),
        wordCount,
      })
      .where(eq(readingItems.id, item.id))
      .returning()

    // Fill bookmark metadata the share sheet didn't have time to fetch.
    const [updatedBookmark] = await db
      .update(bookmarks)
      .set({
        description: bookmark.description || result.description || null,
        image: bookmark.image || result.image || null,
        modifiedAt: new Date(),
        title: bookmark.title || result.title || null,
      })
      .where(eq(bookmarks.id, bookmark.id))
      .returning()

    return { bookmark: updatedBookmark, item: updatedItem }
  } catch (error) {
    console.error('reader extraction failed', bookmark.url, error)
    const [updatedItem] = await db
      .update(readingItems)
      .set({ state: 'failed', updatedAt: new Date() })
      .where(eq(readingItems.id, item.id))
      .returning()

    return { bookmark, item: updatedItem }
  }
}

/**
 * Every active bookmark of type `article` belongs in the reading list, including
 * ones saved on the web before the reader existed. Rows are added lazily on each
 * list call so the app never has to know about a backfill.
 *
 * ponytail: one extra indexed query per sync. Move to a trigger if it shows up.
 */
const ensureReadingRows = async (db: Db, userId: string) => {
  const missing = await db
    .select({ createdAt: bookmarks.createdAt, id: bookmarks.id })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.user, userId),
        eq(bookmarks.type, 'article'),
        eq(bookmarks.status, 'active'),
        notInArray(
          bookmarks.id,
          db
            .select({ id: readingItems.bookmarkId })
            .from(readingItems)
            .where(eq(readingItems.userId, userId)),
        ),
      ),
    )

  if (missing.length) {
    await db
      .insert(readingItems)
      // created_at means "when it was saved as a bookmark", so copy the
      // bookmark's date rather than stamping the sync time.
      .values(
        missing.map(({ createdAt, id }) => ({
          bookmarkId: id,
          createdAt,
          userId,
        })),
      )
      .onConflictDoNothing()
  }
}

/**
 * POST /api/reader/items  { url }
 * Idempotent per URL: re-saving an article returns the existing item.
 */
export const createReadingItem = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const body = (await context.req.json()) as Record<string, unknown>
    let url = typeof body.url === 'string' ? body.url.trim() : ''

    if (!url) {
      return errorResponse({ reason: 'Missing url', status: 400 })
    }
    if (!url.match(/^[a-zA-Z]+:\/\//)) url = `https://${url}`
    assertSafePublicUrl(url)

    const { db, userId } = auth
    let [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.user, userId),
          eq(bookmarks.url, url),
          eq(bookmarks.status, 'active'),
        ),
      )
      .limit(1)

    if (!bookmark) {
      ;[bookmark] = await db
        .insert(bookmarks)
        .values({ type: 'article', url, user: userId })
        .returning()
    } else if (bookmark.type !== 'article') {
      ;[bookmark] = await db
        .update(bookmarks)
        .set({ modifiedAt: new Date(), type: 'article' })
        .where(eq(bookmarks.id, bookmark.id))
        .returning()
    }

    let [item] = await db
      .select()
      .from(readingItems)
      .where(eq(readingItems.bookmarkId, bookmark.id))
      .limit(1)

    if (item && !item.deletedAt) {
      return ok(itemToRow(item, bookmark))
    }

    if (item) {
      ;[item] = await db
        .update(readingItems)
        .set({
          deletedAt: null,
          progress: 0,
          state: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(readingItems.id, item.id))
        .returning()
    } else {
      ;[item] = await db
        .insert(readingItems)
        .values({ bookmarkId: bookmark.id, userId })
        .returning()
    }

    const extracted = await extractInto(db, item, bookmark)

    return ok(itemToRow(extracted.item, extracted.bookmark), 201)
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem saving article',
      status: 400,
    })
  }
}

/**
 * GET /api/reader/items?state=&since=&limit=&offset=
 * Without `since`: live items, unread by default (`state=archived|all`).
 * With `since`: everything changed after that instant, tombstones included —
 * this is the sync endpoint. `next_since` is the server clock to pass back.
 */
export const listReadingItems = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:read'])
    if (auth instanceof Response) return auth

    const { db, userId } = auth
    await ensureReadingRows(db, userId)
    const now = new Date()
    const state = context.req.query('state') ?? 'unread'
    const sinceParam = context.req.query('since')
    const since = sinceParam ? new Date(sinceParam) : null
    const limit = Math.min(Number(context.req.query('limit') ?? 50), 200)
    const offset = Number(context.req.query('offset') ?? 0)

    if (since && Number.isNaN(since.getTime())) {
      return errorResponse({ reason: 'Invalid since', status: 400 })
    }

    const conditions = [eq(readingItems.userId, userId)]

    if (since) {
      conditions.push(gt(readingItems.updatedAt, since))
    } else {
      conditions.push(isNull(readingItems.deletedAt))
      conditions.push(eq(bookmarks.status, 'active'))
      if (state === 'unread') {
        conditions.push(
          inArray(readingItems.state, ['pending', 'ready', 'failed']),
        )
      } else if (state !== 'all') {
        if (!READING_STATES.includes(state as ReadingState)) {
          return errorResponse({ reason: 'Unknown state', status: 400 })
        }
        conditions.push(eq(readingItems.state, state as ReadingState))
      }
    }

    const rows = await db
      .select({ bookmark: bookmarks, item: readingItems })
      .from(readingItems)
      .innerJoin(bookmarks, eq(bookmarks.id, readingItems.bookmarkId))
      .where(and(...conditions))
      .orderBy(
        since ? desc(readingItems.updatedAt) : desc(readingItems.createdAt),
        // Stable paging when dates tie.
        desc(readingItems.id),
      )
      .limit(limit)
      .offset(offset)

    return ok(
      rows.map(({ bookmark, item }) => itemToRow(item, bookmark)),
      200,
      { limit, next_since: now.toISOString(), offset },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem listing articles',
      status: 400,
    })
  }
}

/** GET /api/reader/items/:id — full content plus live highlights. */
export const getReadingItem = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:read'])
    if (auth instanceof Response) return auth

    let found = await findItem(auth.db, idParam(context), auth.userId)
    if (!found || found.item.deletedAt) {
      return errorResponse({ reason: 'Article not found', status: 404 })
    }

    // Backfilled rows have no content yet: extract the first time one is opened.
    if (found.item.state === 'pending' && !found.item.contentMd) {
      found = await extractInto(auth.db, found.item, found.bookmark)
    }

    const itemHighlights = await auth.db
      .select()
      .from(highlights)
      .where(
        and(
          eq(highlights.readingItemId, found.item.id),
          isNull(highlights.deletedAt),
        ),
      )
      .orderBy(highlights.createdAt)

    return ok({
      ...itemToRow(found.item, found.bookmark, true),
      highlights: itemHighlights.map(highlightToRow),
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting article',
      status: 400,
    })
  }
}

/** PATCH /api/reader/items/:id  { state?, progress?, last_position? } */
export const updateReadingItem = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const found = await findItem(auth.db, idParam(context), auth.userId)
    if (!found || found.item.deletedAt) {
      return errorResponse({ reason: 'Article not found', status: 404 })
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const [item] = await auth.db
      .update(readingItems)
      .set({ ...toReadingPatch(found.item, body), updatedAt: new Date() })
      .where(eq(readingItems.id, found.item.id))
      .returning()

    return ok(itemToRow(item, found.bookmark))
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating article',
      status: 400,
    })
  }
}

/** DELETE /api/reader/items/:id — soft delete; the bookmark stays. */
export const deleteReadingItem = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const now = new Date()
    const [item] = await auth.db
      .update(readingItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(readingItems.id, idParam(context)),
          eq(readingItems.userId, auth.userId),
        ),
      )
      .returning({ id: readingItems.id })

    if (!item) {
      return errorResponse({ reason: 'Article not found', status: 404 })
    }

    return ok({ id: item.id })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem deleting article',
      status: 400,
    })
  }
}

/** POST /api/reader/items/:id/reextract */
export const reextractReadingItem = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const found = await findItem(auth.db, idParam(context), auth.userId)
    if (!found || found.item.deletedAt) {
      return errorResponse({ reason: 'Article not found', status: 404 })
    }

    const extracted = await extractInto(auth.db, found.item, found.bookmark)

    return ok(itemToRow(extracted.item, extracted.bookmark, true))
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem re-extracting article',
      status: 400,
    })
  }
}

// --- Highlights ---------------------------------------------------------

const toHighlightSet = (body: Record<string, unknown>) => {
  const values: Partial<typeof highlights.$inferInsert> = {}

  if ('color' in body) values.color = body.color as string | null
  if ('note' in body) values.note = body.note as string | null
  if ('prefix' in body) values.prefix = body.prefix as string | null
  if ('suffix' in body) values.suffix = body.suffix as string | null
  if (typeof body.exact === 'string') values.exact = body.exact

  return values
}

/** GET /api/reader/highlights?since= — sync feed, tombstones included. */
export const listHighlights = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:read'])
    if (auth instanceof Response) return auth

    const now = new Date()
    const sinceParam = context.req.query('since')
    const since = sinceParam ? new Date(sinceParam) : null

    if (since && Number.isNaN(since.getTime())) {
      return errorResponse({ reason: 'Invalid since', status: 400 })
    }

    const rows = await auth.db
      .select()
      .from(highlights)
      .where(
        and(
          eq(highlights.userId, auth.userId),
          since
            ? gt(highlights.updatedAt, since)
            : isNull(highlights.deletedAt),
        ),
      )
      .orderBy(desc(highlights.updatedAt))
      .limit(500)

    return ok(rows.map(highlightToRow), 200, {
      next_since: now.toISOString(),
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem listing highlights',
      status: 400,
    })
  }
}

/**
 * POST /api/reader/highlights  { id?, reading_item_id, exact, prefix?, suffix?, note?, color? }
 * A client-generated `id` makes the call idempotent for the offline queue.
 */
export const createHighlight = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const body = (await context.req.json()) as Record<string, unknown>
    const readingItemId = body.reading_item_id

    if (typeof readingItemId !== 'string' || typeof body.exact !== 'string') {
      return errorResponse({
        reason: 'reading_item_id and exact are required',
        status: 400,
      })
    }

    const found = await findItem(auth.db, readingItemId, auth.userId)
    if (!found || found.item.deletedAt) {
      return errorResponse({ reason: 'Article not found', status: 404 })
    }

    const values = {
      ...toHighlightSet(body),
      exact: body.exact,
      readingItemId,
      userId: auth.userId,
    }
    const id = typeof body.id === 'string' ? body.id : undefined
    const [row] = await auth.db
      .insert(highlights)
      .values({ ...values, id })
      .onConflictDoUpdate({
        set: { ...values, deletedAt: null, updatedAt: new Date() },
        target: highlights.id,
        where: eq(highlights.userId, auth.userId),
      })
      .returning()

    return ok(highlightToRow(row), 201)
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem saving highlight',
      status: 400,
    })
  }
}

/** PATCH /api/reader/highlights/:id  { note?, color? } — last write wins. */
export const updateHighlight = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const body = (await context.req.json()) as Record<string, unknown>
    const [row] = await auth.db
      .update(highlights)
      .set({ ...toHighlightSet(body), updatedAt: new Date() })
      .where(
        and(
          eq(highlights.id, idParam(context)),
          eq(highlights.userId, auth.userId),
          isNull(highlights.deletedAt),
        ),
      )
      .returning()

    if (!row) {
      return errorResponse({ reason: 'Highlight not found', status: 404 })
    }

    return ok(highlightToRow(row))
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating highlight',
      status: 400,
    })
  }
}

/** DELETE /api/reader/highlights/:id — soft delete. */
export const deleteHighlight = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])
    if (auth instanceof Response) return auth

    const now = new Date()
    const [row] = await auth.db
      .update(highlights)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(highlights.id, idParam(context)),
          eq(highlights.userId, auth.userId),
        ),
      )
      .returning({ id: highlights.id })

    if (!row) {
      return errorResponse({ reason: 'Highlight not found', status: 404 })
    }

    return ok({ id: row.id })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem deleting highlight',
      status: 400,
    })
  }
}
