import { and, desc, eq, gte, lte } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks } from '../db/schema'
import { bookmarkToRow } from './bookmarks/mapper'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

const subDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() - days)
  return next
}

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

export const getDashboard = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const today = new Date()
    const getRecent = async () => {
      const rows = await auth.requestContext.db
        .select()
        .from(bookmarks)
        .where(
          and(eq(bookmarks.user, auth.userId), eq(bookmarks.status, 'active')),
        )
        .orderBy(desc(bookmarks.createdAt))
        .limit(4)

      return rows.map(bookmarkToRow)
    }
    const getBucket = async (lowerDays: number, upperDays: number) => {
      const lower = subDays(today, lowerDays)
      const upper = subDays(today, upperDays)
      const rows = await auth.requestContext.db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.user, auth.userId),
            eq(bookmarks.status, 'active'),
            gte(bookmarks.createdAt, lower),
            lte(bookmarks.createdAt, upper),
          ),
        )
        .orderBy(desc(bookmarks.createdAt))
        .limit(5)

      return rows.map(bookmarkToRow)
    }

    const [
      recent,
      oneWeekAgo,
      oneMonthAgo,
      twoMonthsAgo,
      sixMonthsAgo,
      oneYearAgo,
    ] = await Promise.all([
      getRecent(),
      getBucket(8, 6),
      getBucket(31, 29),
      getBucket(61, 59),
      getBucket(181, 179),
      getBucket(366, 364),
    ])

    return new Response(
      JSON.stringify({
        oneMonthAgo,
        oneWeekAgo,
        oneYearAgo,
        recent,
        sixMonthsAgo,
        twoMonthsAgo,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting dashboard',
      status: 400,
    })
  }
}
