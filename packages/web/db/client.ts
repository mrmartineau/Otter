import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

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

export const createDbClient = (env: DbEnv) => {
  const client = new Client({ connectionString: getDatabaseUrl(env) })
  const db = drizzle(client, { schema })
  return { client, db }
}
