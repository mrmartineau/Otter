import { createMiddleware } from 'hono/factory'
import { createDbClient, type Db } from '../../db/client'
import type { WorkerEnv } from '../env'

declare module 'hono' {
  interface ContextVariableMap {
    db: Db
  }
}

export const dbMiddleware = createMiddleware<{
  Bindings: WorkerEnv
}>(async (c, next) => {
  const { client, db } = createDbClient(c.env)
  await client.connect()
  c.set('db', db)
  try {
    await next()
  } finally {
    c.executionCtx.waitUntil(client.end().catch(() => {}))
  }
})
