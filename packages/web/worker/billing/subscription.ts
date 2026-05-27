import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import type { BillingStatus } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { profiles } from '../../db/schema'
import { getBookmarkQuota } from '../bookmarks/quota'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * GET /api/billing
 * Returns the current user's plan, subscription status and daily bookmark
 * quota usage.
 */
export const getBillingStatus = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const userId = requestContext.user?.id

    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const db = requestContext.db

    const [profile] = await db
      .select({
        billingCycle: profiles.billingCycle,
        cancelAtPeriodEnd: profiles.cancelAtPeriodEnd,
        currentPeriodEnd: profiles.currentPeriodEnd,
        plan: profiles.plan,
        stripeCustomerId: profiles.stripeCustomerId,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    const quota = await getBookmarkQuota(db, context.env, userId)

    const data: BillingStatus = {
      billing_cycle: profile?.billingCycle ?? null,
      cancel_at_period_end: profile?.cancelAtPeriodEnd ?? false,
      current_period_end: profile?.currentPeriodEnd?.toISOString() ?? null,
      has_stripe_customer: Boolean(profile?.stripeCustomerId),
      plan: profile?.plan ?? 'free',
      quota,
      status: profile?.subscriptionStatus ?? 'inactive',
    }

    return new Response(JSON.stringify({ data, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting billing status',
      status: 400,
    })
  }
}
