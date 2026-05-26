import { and, count, eq, gte } from 'drizzle-orm'
import { BILLING_ENABLED } from '@/constants'
import type { BookmarkQuota } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import type { Db } from '../../db/client'
import { bookmarks, profiles } from '../../db/schema'
import { getFreeDailyBookmarkLimit } from '../billing/plans'
import type { WorkerEnv } from '../env'

/** Midnight (UTC) of the given day. Bookmark `created_at` is stored in UTC. */
const startOfUtcDay = (date = new Date()): Date => {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

/**
 * Resolves the current daily bookmark quota for a user.
 *
 * Unlimited (`limit: null`) for Pro and complimentary (`comp`) plans, and
 * for admins. Free users get the per-user override if set, otherwise the
 * deployment-wide free limit.
 */
export const getBookmarkQuota = async (
  db: Db,
  env: WorkerEnv,
  userId: string,
): Promise<BookmarkQuota> => {
  // Billing disabled — every user is unlimited.
  if (!BILLING_ENABLED) {
    return { limit: null, remaining: null, used: 0 }
  }

  const [profile] = await db
    .select({
      override: profiles.dailyBookmarkLimitOverride,
      plan: profiles.plan,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  // Pro, complimentary and admin users have no daily cap.
  if (
    profile?.plan === 'pro' ||
    profile?.plan === 'comp' ||
    profile?.role === 'admin'
  ) {
    return { limit: null, remaining: null, used: 0 }
  }

  const limit = profile?.override ?? getFreeDailyBookmarkLimit(env)

  const [row] = await db
    .select({ value: count() })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.user, userId),
        gte(bookmarks.createdAt, startOfUtcDay()),
      ),
    )
  const used = row?.value ?? 0

  return { limit, remaining: Math.max(0, limit - used), used }
}

/**
 * Returns a 402 Response if creating `addCount` more bookmarks today would
 * exceed the user's quota, otherwise `null`. Call before inserting bookmarks.
 */
export const enforceBookmarkQuota = async (
  db: Db,
  env: WorkerEnv,
  userId: string,
  addCount = 1,
): Promise<Response | null> => {
  const quota = await getBookmarkQuota(db, env, userId)

  if (quota.limit === null) {
    return null
  }

  if (quota.used + addCount > quota.limit) {
    return errorResponse({
      error: `Daily bookmark limit reached. The Free plan allows ${quota.limit} new bookmark${
        quota.limit === 1 ? '' : 's'
      } per day. Upgrade to Pro for unlimited bookmarks.`,
      reason: 'Daily bookmark quota exceeded',
      status: 402,
    })
  }

  return null
}
