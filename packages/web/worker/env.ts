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
  }
