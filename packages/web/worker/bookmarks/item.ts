import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import type { BookmarkStatus, BookmarkType } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { bookmarkToRow } from './mapper'
import { scheduleBookmarkSideEffects } from './sideEffects'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type BookmarkInsert = typeof bookmarks.$inferInsert

const getAuthed = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

const readJson = async (context: HonoContext) =>
  (await context.req.json()) as Record<string, unknown>

const getIdParam = (context: HonoContext) => {
  const id = context.req.param('id')

  if (!id) {
    throw new Error('Missing bookmark id')
  }

  return id
}

const toBookmarkSet = (
  body: Record<string, unknown>,
): Partial<BookmarkInsert> => {
  const update: Partial<BookmarkInsert> = {}

  if ('bluesky_post_uri' in body) {
    update.blueskyPostUri = body.bluesky_post_uri as string | null
  }
  if ('click_count' in body) update.clickCount = body.click_count as number
  if ('description' in body)
    update.description = body.description as string | null
  if ('feed' in body) update.feed = body.feed as string | null
  if ('image' in body) update.image = body.image as string | null
  if ('note' in body) update.note = body.note as string | null
  if ('public' in body) update.public = body.public as boolean
  if ('star' in body) update.star = body.star as boolean
  if ('status' in body) update.status = body.status as BookmarkStatus
  if ('tags' in body) update.tags = body.tags as string[] | null
  if ('title' in body) update.title = body.title as string | null
  if ('tweet' in body) update.tweet = body.tweet
  if ('type' in body) update.type = body.type as BookmarkType | null
  if ('url' in body) update.url = body.url as string | null

  return update
}

export const getBookmarkById = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const id = getIdParam(context)
    const [bookmark] = await auth.requestContext.db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.user, auth.userId)))
      .limit(1)

    if (!bookmark) {
      return errorResponse({
        error: 'Bookmark not found',
        reason: 'Bookmark not found or access denied',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: bookmarkToRow(bookmark), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting bookmark',
      status: 400,
    })
  }
}

export const createBookmark = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = await readJson(context)
    const [bookmark] = await auth.requestContext.db
      .insert(bookmarks)
      .values({
        ...toBookmarkSet(body),
        user: auth.userId,
      })
      .returning()
    const bookmarkRow = bookmarkToRow(bookmark)

    scheduleBookmarkSideEffects(context, {
      record: bookmarkRow,
      type: 'INSERT',
    })

    return new Response(JSON.stringify({ data: bookmarkRow, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem creating bookmark',
      status: 400,
    })
  }
}

export const updateBookmarkById = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const id = getIdParam(context)
    const body = await readJson(context)
    const [oldBookmark] = await auth.requestContext.db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.user, auth.userId)))
      .limit(1)

    if (!oldBookmark) {
      return errorResponse({
        error: 'Bookmark not found',
        reason: 'Bookmark not found or access denied',
        status: 404,
      })
    }

    const [bookmark] = await auth.requestContext.db
      .update(bookmarks)
      .set({
        ...toBookmarkSet(body),
        modifiedAt: new Date(),
      })
      .where(and(eq(bookmarks.id, id), eq(bookmarks.user, auth.userId)))
      .returning()
    const bookmarkRow = bookmarkToRow(bookmark)

    scheduleBookmarkSideEffects(context, {
      old_record: bookmarkToRow(oldBookmark),
      record: bookmarkRow,
      type: 'UPDATE',
    })

    return new Response(JSON.stringify({ data: bookmarkRow, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating bookmark',
      status: 400,
    })
  }
}

export const incrementBookmarkClickCount = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const id = getIdParam(context)
    const [bookmark] = await auth.requestContext.db
      .update(bookmarks)
      .set({
        clickCount: sql`${bookmarks.clickCount} + 1`,
        modifiedAt: new Date(),
      })
      .where(and(eq(bookmarks.id, id), eq(bookmarks.user, auth.userId)))
      .returning()

    if (!bookmark) {
      return errorResponse({
        error: 'Bookmark not found',
        reason: 'Bookmark not found or access denied',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: bookmarkToRow(bookmark), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating bookmark click count',
      status: 400,
    })
  }
}

export const deleteBookmarkById = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const id = getIdParam(context)
    const [bookmark] = await auth.requestContext.db
      .delete(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.user, auth.userId)))
      .returning()

    if (!bookmark) {
      return errorResponse({
        error: 'Bookmark not found',
        reason: 'Bookmark not found or access denied',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: bookmarkToRow(bookmark), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem deleting bookmark',
      status: 400,
    })
  }
}

export const checkBookmarkUrl = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const urlInput = context.req.query('url_input') ?? ''
    const data = await auth.requestContext.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.user, auth.userId),
          eq(bookmarks.status, 'active'),
          ilike(bookmarks.url, `%${urlInput}%`),
        ),
      )
      .orderBy(desc(bookmarks.createdAt))

    return new Response(
      JSON.stringify({ data: data.map(bookmarkToRow), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem checking bookmark URL',
      status: 400,
    })
  }
}
