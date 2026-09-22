import { app } from './hono'
import { fetchAndStoreYouTubeLikes } from './youtube/fetch-likes'

// https://hono.dev/docs/getting-started/cloudflare-workers#using-hono-with-other-event-handlers
export default {
  fetch: app.fetch,

  scheduled: async (
    event: ScheduledEvent,
    _env: unknown,
    ctx: ExecutionContext,
  ) => {
    switch (event.cron) {
      case '*/15 * * * *':
        ctx.waitUntil(fetchAndStoreYouTubeLikes())
        break
      default:
        console.log(`Unknown cron schedule: ${event.cron}`)
    }
  },
}
