import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks, toots, tweets } from '../db/schema'
import {
  collectionMatchCondition,
  getCollections,
  getTagCounts,
  getTypeCounts,
} from './bookmarks/aggregates'
import { bookmarkToRow } from './bookmarks/mapper'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

const getAuthed = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context, ['profile:read'])

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

const countBookmarks = async (
  auth: Exclude<Awaited<ReturnType<typeof getAuthed>>, Response>,
  extraCondition?: ReturnType<typeof eq> | ReturnType<typeof gte>,
) => {
  const [{ value }] = await auth.requestContext.db
    .select({ value: count() })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.user, auth.userId),
        eq(bookmarks.status, 'active'),
        extraCondition,
      ),
    )

  return value ?? 0
}

export const getMeta = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const { db } = auth.requestContext
    const [
      all,
      top,
      publicItems,
      stars,
      trash,
      tags,
      types,
      collections,
      tootsCount,
      likedToots,
      tweetsCount,
      likedTweets,
    ] = await Promise.all([
      countBookmarks(auth),
      countBookmarks(auth, gte(bookmarks.clickCount, 1)),
      countBookmarks(auth, eq(bookmarks.public, true)),
      countBookmarks(auth, eq(bookmarks.star, true)),
      (async () => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.user, auth.userId),
              eq(bookmarks.status, 'inactive'),
            ),
          )
        return value ?? 0
      })(),
      getTagCounts(db, auth.userId, { includeUntagged: true }),
      getTypeCounts(db, auth.userId),
      getCollections(db, auth.userId),
      (async () => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(toots)
          .where(
            and(eq(toots.dbUserId, auth.userId), eq(toots.likedToot, false)),
          )
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(toots)
          .where(
            and(eq(toots.dbUserId, auth.userId), eq(toots.likedToot, true)),
          )
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(tweets)
          .where(
            and(eq(tweets.dbUserId, auth.userId), eq(tweets.likedTweet, false)),
          )
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(tweets)
          .where(
            and(eq(tweets.dbUserId, auth.userId), eq(tweets.likedTweet, true)),
          )
        return value ?? 0
      })(),
    ])

    return new Response(
      JSON.stringify({
        all,
        collections,
        likedToots,
        likedTweets,
        public: publicItems,
        stars,
        tags,
        toots: tootsCount,
        top,
        trash,
        tweets: tweetsCount,
        types,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting metadata',
      status: 400,
    })
  }
}

export const getTags = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    return new Response(
      JSON.stringify(
        await getTagCounts(auth.requestContext.db, auth.userId, {
          includeUntagged: true,
        }),
      ),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting tags',
      status: 400,
    })
  }
}

export const renameTag = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as {
      new_tag?: string
      old_tag?: string
    }
    const oldTag = body.old_tag?.trim()
    const newTag = body.new_tag?.trim()

    if (!oldTag || !newTag) {
      return errorResponse({
        error: 'Missing tag name',
        reason: 'Both old_tag and new_tag are required',
        status: 400,
      })
    }

    // Single UPDATE: replace the tag in-place, then dedupe (the new tag may
    // already be present) while preserving each tag's first-occurrence order.
    const result = await auth.requestContext.db.execute(sql`
      UPDATE ${bookmarks}
      SET tags = (
        SELECT array_agg(u.tag ORDER BY u.ord)
        FROM (
          SELECT DISTINCT ON (t.tag) t.tag AS tag, t.ord AS ord
          FROM unnest(array_replace(${bookmarks.tags}, ${oldTag}, ${newTag}))
            WITH ORDINALITY AS t(tag, ord)
          ORDER BY t.tag, t.ord
        ) AS u
      ),
      modified_at = timezone('utc', now())
      WHERE ${bookmarks.user} = ${auth.userId}
        AND ${bookmarks.status} = 'active'
        AND ${oldTag} = ANY(${bookmarks.tags})
    `)

    return new Response(
      JSON.stringify({
        count: result.rowCount ?? 0,
        error: null,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem renaming tag',
      status: 400,
    })
  }
}

export const getCollectionsTags = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    return new Response(
      JSON.stringify(await getCollections(auth.requestContext.db, auth.userId)),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting collection tags',
      status: 400,
    })
  }
}

export const getCollectionBookmarks = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const name = context.req.param('collection')
    if (!name) {
      return errorResponse({
        reason: 'Missing collection name',
        status: 400,
      })
    }

    const params = apiParameters(
      Object.fromEntries(new URL(context.req.url).searchParams),
    )
    const limit = params.limit ?? DEFAULT_API_RESPONSE_LIMIT
    const offset = params.offset ?? 0
    const { db } = auth.requestContext
    const where = and(
      eq(bookmarks.user, auth.userId),
      eq(bookmarks.status, 'active'),
      collectionMatchCondition(name),
    )
    const [[{ value: total }], rows] = await Promise.all([
      db.select({ value: count() }).from(bookmarks).where(where),
      db
        .select()
        .from(bookmarks)
        .where(where)
        .orderBy(desc(bookmarks.createdAt))
        .limit(limit)
        .offset(offset),
    ])

    return new Response(
      JSON.stringify({
        count: total ?? 0,
        data: rows.map(bookmarkToRow),
        error: null,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting collection bookmarks',
      status: 400,
    })
  }
}
