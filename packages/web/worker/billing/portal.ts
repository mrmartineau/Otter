import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { profiles } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { getAppUrl, getStripe } from './stripe'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * POST /api/billing/portal
 * Creates a Stripe Billing Portal session so a customer can manage or cancel
 * their subscription, and returns its URL.
 */
export const createPortalSession = async (context: HonoContext) => {
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
    const stripe = getStripe(context.env)
    const appUrl = getAppUrl(context.env)

    const [profile] = await db
      .select({ stripeCustomerId: profiles.stripeCustomerId })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    if (!profile?.stripeCustomerId) {
      return errorResponse({
        error: 'No billing account found',
        reason: 'You do not have a Stripe customer record yet',
        status: 404,
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    })

    return new Response(
      JSON.stringify({ data: { url: session.url }, error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem opening billing portal',
      status: 400,
    })
  }
}
