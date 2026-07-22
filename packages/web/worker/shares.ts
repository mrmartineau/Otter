import {
  and,
  arrayContains,
  count,
  desc,
  eq,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { authUsers, bookmarks, profiles, shares } from '../db/schema'
import { bookmarkToRow } from './bookmarks/mapper'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type ShareKind = (typeof shares.$inferSelect)['kind']

const isShareKind = (value: unknown): value is ShareKind =>
  value === 'tag' || value === 'collection'

const generateToken = () => crypto.randomUUID().replace(/-/g, '')

const shareBookmarksCondition = (
  kind: ShareKind,
  name: string,
  userId: string,
) => {
  const base = and(
    eq(bookmarks.user, userId),
    eq(bookmarks.status, 'active'),
  )

  if (kind === 'tag') {
    if (name === 'Untagged') {
      return and(
        base,
        or(isNull(bookmarks.tags), sql`cardinality(${bookmarks.tags}) = 0`),
      )
    }
    return and(base, arrayContains(bookmarks.tags, [name]))
  }

  // collection: any tag equal to NAME or starting with "NAME:"
  return and(
    base,
    or(
      arrayContains(bookmarks.tags, [name]),
      sql`EXISTS (SELECT 1 FROM unnest(${bookmarks.tags}) AS t WHERE t LIKE ${`${name}:%`})`,
    ),
  )
}

export const listShares = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'profile:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const rows = await requestContext.db
      .select()
      .from(shares)
      .where(eq(shares.userId, userId))

    return new Response(
      JSON.stringify(
        rows.map((row) => ({
          created_at: row.createdAt.toISOString(),
          id: row.id,
          kind: row.kind,
          name: row.name,
          token: row.token,
        })),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem listing shares',
      status: 400,
    })
  }
}

export const createOrRotateShare = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'profile:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const body = (await context.req.json()) as {
      kind?: unknown
      name?: unknown
      rotate?: unknown
    }
    const kind = body.kind
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const rotate = body.rotate === true || body.rotate === 'true'

    if (!isShareKind(kind) || !name) {
      return errorResponse({
        reason: 'kind (tag|collection) and name are required',
        status: 400,
      })
    }

    const [existing] = await requestContext.db
      .select()
      .from(shares)
      .where(
        and(
          eq(shares.userId, userId),
          eq(shares.kind, kind),
          eq(shares.name, name),
        ),
      )
      .limit(1)

    if (existing && !rotate) {
      return new Response(
        JSON.stringify({
          kind: existing.kind,
          name: existing.name,
          token: existing.token,
        }),
        { headers: API_HEADERS, status: 200 },
      )
    }

    const token = generateToken()

    if (existing) {
      const [row] = await requestContext.db
        .update(shares)
        .set({ token, updatedAt: new Date() })
        .where(eq(shares.id, existing.id))
        .returning()
      return new Response(
        JSON.stringify({ kind: row.kind, name: row.name, token: row.token }),
        { headers: API_HEADERS, status: 200 },
      )
    }

    const [row] = await requestContext.db
      .insert(shares)
      .values({ kind, name, token, userId })
      .returning()

    return new Response(
      JSON.stringify({ kind: row.kind, name: row.name, token: row.token }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem creating share',
      status: 400,
    })
  }
}

export const deleteShare = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'profile:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const url = new URL(context.req.url)
    const kind = url.searchParams.get('kind')
    const name = url.searchParams.get('name')?.trim() ?? ''

    if (!isShareKind(kind) || !name) {
      return errorResponse({
        reason: 'kind (tag|collection) and name are required',
        status: 400,
      })
    }

    await requestContext.db
      .delete(shares)
      .where(
        and(
          eq(shares.userId, userId),
          eq(shares.kind, kind),
          eq(shares.name, name),
        ),
      )

    return new Response(JSON.stringify({ ok: true }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem deleting share',
      status: 400,
    })
  }
}

/**
 * GET /api/share/:token
 * Public. Returns share metadata + a page of bookmarks.
 */
export const getPublicShare = async (context: HonoContext) => {
  try {
    const token = context.req.param('token')
    if (!token) {
      return errorResponse({ reason: 'Share not found', status: 404 })
    }

    const db = context.var.db

    const [share] = await db
      .select({
        kind: shares.kind,
        name: shares.name,
        userId: shares.userId,
      })
      .from(shares)
      .where(eq(shares.token, token))
      .limit(1)

    if (!share) {
      return errorResponse({ reason: 'Share not found', status: 404 })
    }

    const [owner] = await db
      .select({
        name: authUsers.name,
        username: profiles.username,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.id, share.userId))
      .limit(1)

    const searchParams = searchParamsToObject(context.req.url)
    const limit = Number(searchParams.limit) || DEFAULT_API_RESPONSE_LIMIT
    const offset = Number(searchParams.offset) || 0

    const where = shareBookmarksCondition(share.kind, share.name, share.userId)

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(bookmarks)
      .where(where)

    const rows = await db
      .select()
      .from(bookmarks)
      .where(where)
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify({
        count: total ?? 0,
        data: rows.map(bookmarkToRow),
        kind: share.kind,
        limit,
        name: share.name,
        offset,
        owner: {
          name: owner?.name ?? null,
          username: owner?.username ?? null,
        },
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting shared view',
      status: 400,
    })
  }
}
