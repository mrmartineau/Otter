import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  lt,
  or,
  sql,
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
      tag,
      window: dateWindow,
    } = apiParameters(searchParams)
    const star = parseBoolean(searchParams.star)
    const hasSearchTerm = searchTerm.trim() !== ''
    const tsQuery = sql`websearch_to_tsquery('english', ${searchTerm})`
    const where = and(
      eq(bookmarks.user, userId),
      status ? eq(bookmarks.status, status) : undefined,
      type ? eq(bookmarks.type, type as BookmarkType) : undefined,
      star === undefined ? undefined : eq(bookmarks.star, star),
      tag ? arrayContains(bookmarks.tags, [tag]) : undefined,
      dateWindow
        ? gte(
            bookmarks.createdAt,
            sql`now() - ${dateWindow * 7} * interval '1 day'`,
          )
        : undefined,
      dateWindow && dateWindow > 1
        ? lt(
            bookmarks.createdAt,
            sql`now() - ${(dateWindow - 1) * 7} * interval '1 day'`,
          )
        : undefined,
      hasSearchTerm
        ? or(
            sql`${bookmarks.searchText} @@ ${tsQuery}`,
            ilike(bookmarks.url, `%${searchTerm}%`),
            arrayContains(bookmarks.tags, [searchTerm]),
          )
        : undefined,
    )
    const orderBy =
      order === 'asc'
        ? [asc(bookmarks.createdAt)]
        : hasSearchTerm
          ? [
              desc(sql`ts_rank(${bookmarks.searchText}, ${tsQuery})`),
              desc(bookmarks.createdAt),
            ]
          : [desc(bookmarks.createdAt)]
    const rows = await requestContext.db
      .select({
        ...getTableColumns(bookmarks),
        fullCount: sql`count(*) over ()`.mapWith(Number),
      })
      .from(bookmarks)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset)
    let total = rows[0]?.fullCount ?? 0

    // An offset past the last row returns no rows (and no window count) even
    // when there are matches — fall back to a count query so pagination
    // metadata stays correct.
    if (rows.length === 0 && offset > 0) {
      const [{ value }] = await requestContext.db
        .select({ value: count() })
        .from(bookmarks)
        .where(where)
      total = value ?? 0
    }

    const responseBody = apiResponseGenerator({
      count: total,
      data: rows.map(bookmarkToRow),
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
