import { app } from './hono'

// https://hono.dev/docs/getting-started/cloudflare-workers#using-hono-with-other-event-handlers
export default {
  fetch: app.fetch,

  // scheduled: async (batch, env) => {},
}
