import type { AuthEnv } from '../auth/server'

export type WorkerEnv = Cloudflare.Env &
  AuthEnv & {
    BOT_MASTODON_ACCESS_TOKEN?: string
    DATABASE_URL?: string
    HYPERDRIVE?: Hyperdrive
    PERSONAL_MASTODON_ACCESS_TOKEN?: string
    WEBHOOK_SECRET?: string
  }
