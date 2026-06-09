import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import {
  API_HEADERS,
  BILLING_TIERS,
  type BillingCycleId,
  PAID_TIERS,
} from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { authUsers, profiles } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { getPriceIdForCycle } from './plans'
import { getAppUrl, getStripe } from './stripe'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for the Pro subscription and returns its
 * URL. The caller redirects the browser to that URL.
 */
export const createCheckoutSession = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const userId = requestContext.user?.id

    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    // Default to monthly so older clients (no body) keep working.
    const body = await context.req
      .json<{ tier?: string }>()
      .catch(() => ({ tier: 'monthly' as const }))
    const tier = (body?.tier ?? 'monthly') as BillingCycleId

    if (!PAID_TIERS.includes(tier)) {
      return errorResponse({
        error: `Unknown tier "${tier}"`,
        reason: 'Invalid checkout tier',
        status: 400,
      })
    }

    const priceId = getPriceIdForCycle(context.env, tier)

    if (!priceId) {
      return errorResponse({
        error: `STRIPE_PRICE_ID_${tier.toUpperCase()} is not configured`,
        reason: 'Billing is not configured',
        status: 500,
      })
    }

    const db = requestContext.db
    const stripe = getStripe(context.env)
    const appUrl = getAppUrl(context.env)

    const [account] = await db
      .select({
        billingCycle: profiles.billingCycle,
        email: authUsers.email,
        name: authUsers.name,
        plan: profiles.plan,
        stripeCustomerId: profiles.stripeCustomerId,
      })
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .where(eq(profiles.id, userId))
      .limit(1)

    if (account?.plan === 'pro') {
      // Lifetime users can never be upgraded — block any further checkout.
      if (account.billingCycle === 'lifetime') {
        return errorResponse({
          error: 'You already have lifetime Pro access',
          reason: 'Already on lifetime',
          status: 400,
        })
      }
      // Monthly/annual users should switch via the customer portal, not by
      // starting a brand-new subscription.
      return errorResponse({
        error: 'Use the customer portal to change your subscription',
        reason: 'Already subscribed',
        status: 400,
      })
    }

    // Reuse the existing Stripe customer, or create one on first checkout.
    let customerId = account?.stripeCustomerId ?? null

    if (!customerId) {
      // Idempotency key prevents parallel checkout calls from creating
      // duplicate Stripe customers for the same user.
      const customer = await stripe.customers.create(
        {
          email: account?.email,
          metadata: { user_id: userId },
          name: account?.name ?? undefined,
        },
        { idempotencyKey: `customer-create:${userId}` },
      )
      customerId = customer.id

      await db
        .update(profiles)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(profiles.id, userId))
    }

    const tierConfig = BILLING_TIERS[tier]
    const isLifetime = tierConfig.mode === 'payment'

    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${appUrl}/settings/billing`,
      client_reference_id: userId,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isLifetime ? 'payment' : 'subscription',
      // Tier metadata is the source of truth for the billing cycle the
      // webhook will record. Stored on the subscription (recurring) or the
      // payment intent (lifetime).
      ...(isLifetime
        ? {
            payment_intent_data: {
              metadata: { tier, user_id: userId },
            },
          }
        : {
            subscription_data: {
              metadata: { tier, user_id: userId },
            },
          }),
      // Always echo onto the checkout session itself so checkout.session.completed
      // can disambiguate without a follow-up fetch.
      metadata: { tier, user_id: userId },
      success_url: `${appUrl}/settings/billing?checkout=success`,
    })

    return new Response(
      JSON.stringify({ data: { url: session.url }, error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem starting checkout',
      status: 400,
    })
  }
}
