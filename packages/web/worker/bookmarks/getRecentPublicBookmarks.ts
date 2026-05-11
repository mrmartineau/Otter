import { and, count, desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { bookmarks } from '../../db/schema'
import type { WorkerEnv } from '../env'
import '../middleware/db'
import { bookmarkToRow } from './mapper'

/**
 * GET /api/recent
 * Returns the most recent public bookmarks from all users.
 * No authentication required.
 */
export const getRecentPublicBookmarks = async (
  context: Context<{ Bindings: WorkerEnv }>,
) => {
  const request = context.req
  try {
    const searchParams = searchParamsToObject(request.url)
    const limit = Number(searchParams.limit) || DEFAULT_API_RESPONSE_LIMIT
    const offset = Number(searchParams.offset) || 0

    const db = context.var.db
    const where = and(
      eq(bookmarks.public, true),
      eq(bookmarks.status, 'active'),
    )

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(bookmarks)
      .where(where)

    const data = await db
      .select()
      .from(bookmarks)
      .where(where)
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset)

    const responseBody = apiResponseGenerator({
      count: total ?? 0,
      data: data.map(bookmarkToRow),
      limit,
      offset,
      path: request.url as string,
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
        reason: 'Problem getting recent public bookmarks',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}
