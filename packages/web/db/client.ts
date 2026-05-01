import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = ReturnType<typeof createDb>

export type HyperdriveBinding = {
  connectionString: string
}

export type DbEnv = {
  DATABASE_URL?: string
  HYPERDRIVE?: HyperdriveBinding
}

export const getDatabaseUrl = (env: DbEnv) => {
  const databaseUrl = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('Missing database connection string')
  }

  return databaseUrl
}

export const createDb = (env: DbEnv) => {
  const pool = new Pool({
    connectionString: getDatabaseUrl(env),
  })

  return drizzle(pool, { schema })
}
