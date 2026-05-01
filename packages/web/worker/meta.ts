import { and, count, eq, gte } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { errorResponse } from '@/utils/fetching/errorResponse'
import type { CollectionType, MetaTag, MetaType } from '@/utils/fetching/meta'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks, toots, tweets } from '../db/schema'
import { bookmarkToRow } from './bookmarks/mapper'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type BookmarkRow = typeof bookmarks.$inferSelect

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

const getActiveBookmarks = async (
  auth: Exclude<Awaited<ReturnType<typeof getAuthed>>, Response>,
) =>
  await auth.requestContext.db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.user, auth.userId), eq(bookmarks.status, 'active')))

const tagCounts = (rows: BookmarkRow[]): MetaTag[] => {
  const counts = new Map<string, number>()
  let untagged = 0

  for (const row of rows) {
    if (!row.tags?.length) {
      untagged += 1
      continue
    }

    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const tags = Array.from(counts, ([tag, count]) => ({ count, tag })).sort(
    (a, b) =>
      (b.count ?? 0) - (a.count ?? 0) ||
      (a.tag ?? '').localeCompare(b.tag ?? ''),
  )

  if (untagged > 0) {
    tags.push({ count: untagged, tag: 'Untagged' })
  }

  return tags
}

const typeCounts = (rows: BookmarkRow[]): MetaType[] => {
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (row.type) {
      counts.set(row.type, (counts.get(row.type) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([type, count]) => ({
    count,
    type: type as MetaType['type'],
  }))
}

const collectionCounts = (rows: BookmarkRow[]): CollectionType[] => {
  const collections = new Map<string, { count: number; tags: Set<string> }>()

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      if (!tag.startsWith('collection:')) {
        continue
      }

      const [, collection] = tag.split(':')
      if (!collection) {
        continue
      }

      const item = collections.get(collection) ?? {
        count: 0,
        tags: new Set<string>(),
      }
      item.count += 1
      item.tags.add(tag)
      collections.set(collection, item)
    }
  }

  return Array.from(collections, ([collection, value]) => ({
    bookmark_count: value.count,
    collection,
    tags: Array.from(value.tags),
  }))
}

export const getMeta = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const rows = await getActiveBookmarks(auth)
    const [
      all,
      top,
      publicItems,
      stars,
      trash,
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
        const [{ value }] = await auth.requestContext.db
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
      (async () => {
        const [{ value }] = await auth.requestContext.db
          .select({ value: count() })
          .from(toots)
          .where(eq(toots.likedToot, false))
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await auth.requestContext.db
          .select({ value: count() })
          .from(toots)
          .where(eq(toots.likedToot, true))
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await auth.requestContext.db
          .select({ value: count() })
          .from(tweets)
          .where(eq(tweets.likedTweet, false))
        return value ?? 0
      })(),
      (async () => {
        const [{ value }] = await auth.requestContext.db
          .select({ value: count() })
          .from(tweets)
          .where(eq(tweets.likedTweet, true))
        return value ?? 0
      })(),
    ])

    return new Response(
      JSON.stringify({
        all,
        collections: collectionCounts(rows),
        likedToots,
        likedTweets,
        public: publicItems,
        stars,
        tags: tagCounts(rows),
        toots: tootsCount,
        top,
        trash,
        tweets: tweetsCount,
        types: typeCounts(rows),
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
      JSON.stringify(tagCounts(await getActiveBookmarks(auth))),
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

    const rows = await auth.requestContext.db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.user, auth.userId), eq(bookmarks.status, 'active')),
      )

    const affected = rows.filter((bookmark) =>
      (bookmark.tags ?? []).includes(oldTag),
    )

    await Promise.all(
      affected.map((bookmark) => {
        const tags = Array.from(
          new Set(
            (bookmark.tags ?? []).map((tag) => (tag === oldTag ? newTag : tag)),
          ),
        )

        return auth.requestContext.db
          .update(bookmarks)
          .set({ modifiedAt: new Date(), tags })
          .where(
            and(eq(bookmarks.id, bookmark.id), eq(bookmarks.user, auth.userId)),
          )
      }),
    )

    return new Response(
      JSON.stringify({
        count: affected.length,
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
      JSON.stringify(collectionCounts(await getActiveBookmarks(auth))),
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
    const params = apiParameters(
      Object.fromEntries(new URL(context.req.url).searchParams),
    )
    const limit = params.limit ?? DEFAULT_API_RESPONSE_LIMIT
    const offset = params.offset ?? 0
    const rows = (await getActiveBookmarks(auth)).filter((bookmark) =>
      (bookmark.tags ?? []).some(
        (tag) =>
          tag === `collection:${name}` || tag.startsWith(`collection:${name}:`),
      ),
    )
    const data = rows.slice(offset, offset + limit).map(bookmarkToRow)

    return new Response(
      JSON.stringify({
        count: rows.length,
        data,
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
