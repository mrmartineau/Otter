import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { authUsers, profiles } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
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

    if (!context.env.STRIPE_PRICE_ID) {
      return errorResponse({
        error: 'STRIPE_PRICE_ID is not configured',
        reason: 'Billing is not configured',
        status: 500,
      })
    }

    const db = requestContext.db
    const stripe = getStripe(context.env)
    const appUrl = getAppUrl(context.env)

    const [account] = await db
      .select({
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
      return errorResponse({
        error: 'Already subscribed',
        reason: 'You are already on the Pro plan',
        status: 400,
      })
    }

    // Reuse the existing Stripe customer, or create one on first checkout.
    let customerId = account?.stripeCustomerId ?? null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account?.email,
        metadata: { user_id: userId },
        name: account?.name ?? undefined,
      })
      customerId = customer.id

      await db
        .update(profiles)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(profiles.id, userId))
    }

    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${appUrl}/settings/billing`,
      client_reference_id: userId,
      customer: customerId,
      line_items: [{ price: context.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { metadata: { user_id: userId } },
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
