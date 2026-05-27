import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import type Stripe from 'stripe'
import type { Db } from '../../db/client'
import { profiles } from '../../db/schema'
import type { WorkerEnv } from '../env'
import '../middleware/db'
import { mapStripeStatus, planForStatus } from './plans'
import { getStripe } from './stripe'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * Stripe API versions expose the billing period on the subscription's items
 * rather than the subscription itself.
 */
const getCurrentPeriodEnd = (
  subscription: Stripe.Subscription,
): Date | null => {
  const periodEnd = subscription.items?.data?.[0]?.current_period_end
  return typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null
}

const getCustomerId = (subscription: Stripe.Subscription): string | null => {
  const { customer } = subscription
  if (typeof customer === 'string') return customer
  return customer?.id ?? null
}

/**
 * Finds the Otter user a Stripe subscription belongs to: first via the
 * `user_id` metadata we set at checkout, then by matching the Stripe customer.
 */
const resolveUserId = async (
  db: Db,
  subscription: Stripe.Subscription,
): Promise<string | null> => {
  const fromMetadata = subscription.metadata?.user_id
  if (fromMetadata) return fromMetadata

  const customerId = getCustomerId(subscription)
  if (!customerId) return null

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.stripeCustomerId, customerId))
    .limit(1)

  return profile?.id ?? null
}

/** Writes the live subscription state onto the user's profile. */
const applySubscription = async (
  db: Db,
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> => {
  const status = mapStripeStatus(subscription.status)
  const customerId = getCustomerId(subscription)

  await db
    .update(profiles)
    .set({
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      currentPeriodEnd: getCurrentPeriodEnd(subscription),
      plan: planForStatus(status),
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      updatedAt: new Date(),
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    })
    .where(eq(profiles.id, userId))
}

/**
 * POST /api/billing/webhook
 * Receives Stripe webhook events. Unauthenticated — verified by signature.
 */
export const handleStripeWebhook = async (context: HonoContext) => {
  const env = context.env

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return context.json({ error: 'Billing is not configured' }, 500)
  }

  const stripe = getStripe(env)
  const body = await context.req.text()
  const signature = context.req.header('stripe-signature')

  if (!signature) {
    return context.json({ error: 'Missing stripe-signature header' }, 400)
  }

  let event: Stripe.Event
  try {
    // constructEventAsync is required on Workers — Node crypto is unavailable.
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return context.json({ error: 'Invalid signature' }, 400)
  }

  const db = context.var.db

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          )
          await applySubscription(db, userId, subscription)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const eventSub = event.data.object as Stripe.Subscription
        // Stripe can deliver subscription events out of order. Re-fetch the
        // live subscription so a delayed older event cannot overwrite newer
        // state we already wrote.
        const subscription = await stripe.subscriptions.retrieve(eventSub.id)
        const userId = await resolveUserId(db, subscription)
        if (userId) {
          await applySubscription(db, userId, subscription)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveUserId(db, subscription)
        if (userId) {
          await db
            .update(profiles)
            .set({
              cancelAtPeriodEnd: false,
              currentPeriodEnd: null,
              plan: 'free',
              stripeSubscriptionId: null,
              subscriptionStatus: 'canceled',
              updatedAt: new Date(),
            })
            .where(eq(profiles.id, userId))
        }
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return context.json({ error: 'Webhook handler failed' }, 500)
  }

  return context.json({ received: true })
}
