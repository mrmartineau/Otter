import { count, eq, gte } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, BILLING_PLANS } from '@/constants'
import type { AdminStats } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { authUsers, bookmarks, profiles } from '../../db/schema'
import { requireAdminContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

const daysAgo = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const firstValue = async (
  query: PromiseLike<{ value: number }[]>,
): Promise<number> => (await query)[0]?.value ?? 0

/**
 * GET /api/admin/stats
 * Aggregate stats for the admin dashboard. Admin-only.
 */
export const getAdminStats = async (context: HonoContext) => {
  try {
    const requestContext = await requireAdminContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const db = requestContext.db
    const last7 = daysAgo(7)
    const last30 = daysAgo(30)

    const [
      totalUsers,
      proUsers,
      adminUsers,
      totalBookmarks,
      publicBookmarks,
      bookmarks7,
      bookmarks30,
      signups7,
      signups30,
    ] = await Promise.all([
      firstValue(db.select({ value: count() }).from(authUsers)),
      firstValue(
        db
          .select({ value: count() })
          .from(profiles)
          .where(eq(profiles.plan, 'pro')),
      ),
      firstValue(
        db
          .select({ value: count() })
          .from(profiles)
          .where(eq(profiles.role, 'admin')),
      ),
      firstValue(db.select({ value: count() }).from(bookmarks)),
      firstValue(
        db
          .select({ value: count() })
          .from(bookmarks)
          .where(eq(bookmarks.public, true)),
      ),
      firstValue(
        db
          .select({ value: count() })
          .from(bookmarks)
          .where(gte(bookmarks.createdAt, last7)),
      ),
      firstValue(
        db
          .select({ value: count() })
          .from(bookmarks)
          .where(gte(bookmarks.createdAt, last30)),
      ),
      firstValue(
        db
          .select({ value: count() })
          .from(authUsers)
          .where(gte(authUsers.createdAt, last7)),
      ),
      firstValue(
        db
          .select({ value: count() })
          .from(authUsers)
          .where(gte(authUsers.createdAt, last30)),
      ),
    ])

    const data: AdminStats = {
      admin_users: adminUsers,
      bookmarks_last_7_days: bookmarks7,
      bookmarks_last_30_days: bookmarks30,
      estimated_mrr: proUsers * BILLING_PLANS.pro.price,
      free_users: Math.max(0, totalUsers - proUsers),
      pro_users: proUsers,
      public_bookmarks: publicBookmarks,
      signups_last_7_days: signups7,
      signups_last_30_days: signups30,
      total_bookmarks: totalBookmarks,
      total_users: totalUsers,
    }

    return new Response(JSON.stringify({ data, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting admin stats',
      status: 400,
    })
  }
}
