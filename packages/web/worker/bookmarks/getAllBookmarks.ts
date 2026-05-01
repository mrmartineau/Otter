import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { BookmarkType } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { bookmarks } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { bookmarkToRow } from './mapper'

type HonoContext = Context<{ Bindings: WorkerEnv }>

const parseBoolean = (value: unknown) => {
  if (value === true || value === 'true') {
    return true
  }

  if (value === false || value === 'false') {
    return false
  }

  return undefined
}

/**
 * GET /api/bookmarks
 * This endpoint gets bookmarks
 * It authenticates via an Authorization header (Bearer token)
 */
export const getAllBookmarks = async (context: HonoContext) => {
  try {
    const searchParams = searchParamsToObject(context.req.url)
    const requestContext = await requireRequestContext(context, [
      'bookmarks:read',
    ])

    if (requestContext instanceof Response) {
      return requestContext
    }

    const userId = requestContext.user?.id

    if (!userId) {
      throw new Error('Not authorised')
    }

    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
      status,
      type,
      tag,
      top,
    } = apiParameters(searchParams)
    const star = parseBoolean(searchParams.star)
    const publicItems = parseBoolean(searchParams.public)
    const conditions = [
      eq(bookmarks.user, userId),
      status ? eq(bookmarks.status, status) : undefined,
      star === undefined ? undefined : eq(bookmarks.star, star),
      publicItems === undefined ? undefined : eq(bookmarks.public, publicItems),
      type ? eq(bookmarks.type, type as BookmarkType) : undefined,
      top ? gte(bookmarks.clickCount, 1) : undefined,
      tag && tag !== 'Untagged'
        ? arrayContains(bookmarks.tags, [tag])
        : undefined,
      tag === 'Untagged'
        ? or(isNull(bookmarks.tags), sql`cardinality(${bookmarks.tags}) = 0`)
        : undefined,
    ].filter(Boolean)
    const where = and(...conditions)
    const [{ value: total }] = await requestContext.db
      .select({ value: count() })
      .from(bookmarks)
      .where(where)
    const data = await requestContext.db
      .select()
      .from(bookmarks)
      .where(where)
      .orderBy(
        ...(top
          ? [desc(bookmarks.clickCount), desc(bookmarks.createdAt)]
          : [
              order === 'asc'
                ? asc(bookmarks.createdAt)
                : desc(bookmarks.createdAt),
            ]),
      )
      .limit(limit)
      .offset(offset)
    const responseBody = apiResponseGenerator({
      count: total ?? 0,
      data: data.map(bookmarkToRow),
      limit,
      offset,
      path: context.req.url,
    })

    return new Response(JSON.stringify(responseBody), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem getting bookmarks',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}
