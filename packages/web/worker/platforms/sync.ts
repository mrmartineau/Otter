import { and, eq } from 'drizzle-orm'
import { isPlatformId } from '@/platforms/catalog'
import { getErrorMessage } from '@/utils/get-error-message'
import { createDbClient, type Db, type DbEnv } from '../../db/client'
import { platformConnections, platformItems } from '../../db/schema'
import { platformFetchers } from './registry'
import type { PlatformCredentials } from './types'

type ConnectionRow = typeof platformConnections.$inferSelect

export interface SyncResult {
  added: number
  fetched: number
}

export const syncPlatformConnection = async (
  db: Db,
  connection: ConnectionRow,
): Promise<SyncResult> => {
  if (!isPlatformId(connection.platform)) {
    throw new Error(`Unknown platform: ${connection.platform}`)
  }

  try {
    const fetcher = platformFetchers[connection.platform]
    const items = await fetcher({
      credentials: (connection.credentials ?? {}) as PlatformCredentials,
    })
    let added = 0

    if (items.length) {
      const inserted = await db
        .insert(platformItems)
        .values(
          items.map((item) => ({
            createdAt: item.createdAt,
            description: item.description ?? null,
            externalId: item.externalId,
            image: item.image ?? null,
            metadata: item.metadata ?? null,
            platform: connection.platform,
            title: item.title ?? null,
            url: item.url ?? null,
            userId: connection.userId,
          })),
        )
        .onConflictDoNothing({
          target: [
            platformItems.userId,
            platformItems.platform,
            platformItems.externalId,
          ],
        })
        .returning({ id: platformItems.id })

      added = inserted.length
    }

    await db
      .update(platformConnections)
      .set({ lastError: null, lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(platformConnections.id, connection.id))

    return { added, fetched: items.length }
  } catch (error) {
    await db
      .update(platformConnections)
      .set({ lastError: getErrorMessage(error), updatedAt: new Date() })
      .where(eq(platformConnections.id, connection.id))

    throw error
  }
}

/**
 * Entry point for the Worker's scheduled (cron) handler: sync every enabled
 * connection across all users. Failures are recorded on the connection
 * (lastError) and don't stop the rest of the batch.
 */
export const syncAllPlatformConnections = async (env: DbEnv) => {
  const { client, db } = createDbClient(env)

  await client.connect()

  try {
    const connections = await db
      .select()
      .from(platformConnections)
      .where(and(eq(platformConnections.enabled, true)))

    for (const connection of connections) {
      try {
        await syncPlatformConnection(db, connection)
      } catch (error) {
        console.error(
          `Platform sync failed (${connection.platform}, user ${connection.userId}):`,
          getErrorMessage(error),
        )
      }
    }
  } finally {
    await client.end()
  }
}
