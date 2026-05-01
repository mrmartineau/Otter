import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
} from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { BookmarkType } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { bookmarks } from '../../db/schema'
import { bookmarkToRow } from '../bookmarks/mapper'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * /api/search?q=example
 * This endpoint searches bookmarks with API-key or session auth.
 */
export const getSearch = async (context: HonoContext) => {
  try {
    const { q, ...searchParams } = searchParamsToObject(context.req.url)
    const searchTerm = String(q ?? '')
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
    } = apiParameters(searchParams)
    const pattern = `%${searchTerm}%`
    const where = and(
      eq(bookmarks.user, userId),
      status ? eq(bookmarks.status, status) : undefined,
      type ? eq(bookmarks.type, type as BookmarkType) : undefined,
      or(
        ilike(bookmarks.title, pattern),
        ilike(bookmarks.url, pattern),
        ilike(bookmarks.description, pattern),
        ilike(bookmarks.note, pattern),
        searchTerm ? arrayContains(bookmarks.tags, [searchTerm]) : undefined,
      ),
    )
    const [{ value: total }] = await requestContext.db
      .select({ value: count() })
      .from(bookmarks)
      .where(where)
    const data = await requestContext.db
      .select()
      .from(bookmarks)
      .where(where)
      .orderBy(
        order === 'asc' ? asc(bookmarks.createdAt) : desc(bookmarks.createdAt),
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
    return errorResponse({
      error: errorMessage,
      reason: 'Problem searching bookmarks',
      status: 400,
    })
  }
}
