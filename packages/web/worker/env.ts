import type { AuthEnv } from '../auth/server'

type AssetBinding = {
  fetch: (request: Request) => Promise<Response>
}

export type WorkerEnv = Cloudflare.Env &
  AuthEnv & {
    ASSETS?: AssetBinding
    BOT_MASTODON_ACCESS_TOKEN?: string
    DATABASE_URL?: string
    HYPERDRIVE?: Hyperdrive
    PERSONAL_MASTODON_ACCESS_TOKEN?: string
    WEBHOOK_SECRET?: string
    /** Public URL of the app, used to build Stripe redirect URLs. */
    APP_URL?: string
    /** Stripe secret API key (sk_live_… / sk_test_…). */
    STRIPE_SECRET_KEY?: string
    /** Signing secret for the Stripe webhook endpoint (whsec_…). */
    STRIPE_WEBHOOK_SECRET?: string
    /** Stripe recurring price ID for the monthly Pro subscription. */
    STRIPE_PRICE_ID_MONTHLY?: string
    /** Stripe recurring price ID for the annual Pro subscription. */
    STRIPE_PRICE_ID_ANNUAL?: string
    /** Stripe one-off price ID for the lifetime Pro purchase. */
    STRIPE_PRICE_ID_LIFETIME?: string
    /** Overrides the default number of free bookmarks allowed per day. */
    FREE_DAILY_BOOKMARK_LIMIT?: string
  }
