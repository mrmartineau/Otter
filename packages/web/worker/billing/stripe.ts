import Stripe from 'stripe'
import type { WorkerEnv } from '../env'

/**
 * Builds a Stripe client from the worker env. A fresh client is created per
 * request — there is no shared singleton because Cloudflare Workers isolate
 * module scope per request anyway.
 */
export const getStripe = (env: WorkerEnv): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  return new Stripe(env.STRIPE_SECRET_KEY)
}

/** The public origin of the app, used to build Stripe redirect URLs. */
export const getAppUrl = (env: WorkerEnv): string => {
  const url = env.APP_URL ?? env.BETTER_AUTH_URL

  if (!url) {
    throw new Error('APP_URL (or BETTER_AUTH_URL) is not configured')
  }

  return url.replace(/\/+$/, '')
}
