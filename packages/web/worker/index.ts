import type { WorkerEnv } from './env'
import { app } from './hono'
import { syncAllPlatformConnections } from './platforms/sync'

// https://hono.dev/docs/getting-started/cloudflare-workers#using-hono-with-other-event-handlers
export default {
  fetch: app.fetch,

  scheduled: (
    _controller: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ) => {
    ctx.waitUntil(syncAllPlatformConnections(env))
  },
}
