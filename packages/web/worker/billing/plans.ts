import {
  type BillingCycleId,
  DEFAULT_FREE_DAILY_BOOKMARK_LIMIT,
} from '@/constants'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/db'
import type { WorkerEnv } from '../env'

/**
 * The number of bookmarks a free user may create per day.
 *
 * Resolution order:
 *   1. The `FREE_DAILY_BOOKMARK_LIMIT` worker env var (deployment-wide).
 *   2. {@link DEFAULT_FREE_DAILY_BOOKMARK_LIMIT} (10).
 *
 * A per-user override (`profiles.daily_bookmark_limit_override`) takes
 * precedence over this value and is applied by the quota helpers.
 */
export const getFreeDailyBookmarkLimit = (env: WorkerEnv): number => {
  const raw = env.FREE_DAILY_BOOKMARK_LIMIT

  if (raw != null && raw !== '') {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return DEFAULT_FREE_DAILY_BOOKMARK_LIMIT
}

/** Stripe subscription statuses that entitle a user to the Pro plan. */
const ENTITLED_STATUSES: SubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
]

/** Maps a raw Stripe subscription status onto our internal enum. */
export const mapStripeStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    default:
      return 'inactive'
  }
}

/**
 * Derives the plan a user is entitled to from their subscription status.
 * `past_due` keeps Pro access as a short grace period.
 */
export const planForStatus = (status: SubscriptionStatus): SubscriptionPlan =>
  ENTITLED_STATUSES.includes(status) ? 'pro' : 'free'

/** Stripe price ID configured for a given billing cycle, if any. */
export const getPriceIdForCycle = (
  env: WorkerEnv,
  cycle: BillingCycleId,
): string | undefined => {
  switch (cycle) {
    case 'monthly':
      return env.STRIPE_PRICE_ID_MONTHLY
    case 'annual':
      return env.STRIPE_PRICE_ID_ANNUAL
    case 'lifetime':
      return env.STRIPE_PRICE_ID_LIFETIME
  }
}

/**
 * Reverse map — given a Stripe price ID, return the billing cycle it
 * represents in this deployment. Used by the webhook to label new
 * subscriptions and lifetime purchases.
 */
export const getCycleForPriceId = (
  env: WorkerEnv,
  priceId: string | null | undefined,
): BillingCycleId | null => {
  if (!priceId) return null
  if (priceId === env.STRIPE_PRICE_ID_MONTHLY) return 'monthly'
  if (priceId === env.STRIPE_PRICE_ID_ANNUAL) return 'annual'
  if (priceId === env.STRIPE_PRICE_ID_LIFETIME) return 'lifetime'
  return null
}
