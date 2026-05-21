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
    /** Stripe price ID for the recurring Pro subscription. */
    STRIPE_PRICE_ID?: string
    /** Overrides the default number of free bookmarks allowed per day. */
    FREE_DAILY_BOOKMARK_LIMIT?: string
  }
