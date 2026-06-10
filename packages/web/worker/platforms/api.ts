import { and, asc, count, desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { isPlatformId, type PlatformId } from '@/platforms/catalog'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { bookmarks, platformConnections, platformItems } from '../../db/schema'
import { bookmarkToRow } from '../bookmarks/mapper'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { syncPlatformConnection } from './sync'
import type { PlatformCredentials } from './types'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type ConnectionRow = typeof platformConnections.$inferSelect
type ItemRow = typeof platformItems.$inferSelect

// Credentials never leave the server — clients only learn which keys are set
const connectionToRow = (row: ConnectionRow) => ({
  configured_fields: Object.entries(
    (row.credentials ?? {}) as PlatformCredentials,
  )
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key),
  created_at: row.createdAt.toISOString(),
  enabled: row.enabled,
  last_error: row.lastError,
  last_synced_at: row.lastSyncedAt?.toISOString() ?? null,
  platform: row.platform,
  updated_at: row.updatedAt?.toISOString() ?? null,
})

const itemToRow = (item: ItemRow) => ({
  bookmark_id: item.bookmarkId,
  created_at: item.createdAt.toISOString(),
  description: item.description,
  external_id: item.externalId,
  id: item.id,
  image: item.image,
  ingested_at: item.ingestedAt.toISOString(),
  metadata: item.metadata,
  platform: item.platform,
  title: item.title,
  url: item.url,
  user_id: item.userId,
})

const getAuthed = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

const getPlatformParam = (context: HonoContext): PlatformId | Response => {
  const platform = context.req.param('platform')

  if (!platform || !isPlatformId(platform)) {
    return errorResponse({
      error: `Unknown platform: ${platform}`,
      reason: 'Unknown platform',
      status: 404,
    })
  }

  return platform
}

const findConnection = async (
  auth: Exclude<Awaited<ReturnType<typeof getAuthed>>, Response>,
  platform: PlatformId,
) =>
  await auth.requestContext.db.query.platformConnections.findFirst({
    where: and(
      eq(platformConnections.userId, auth.userId),
      eq(platformConnections.platform, platform),
    ),
  })

export const getPlatformConnections = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const connections = await auth.requestContext.db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, auth.userId))
      .orderBy(asc(platformConnections.platform))

    return new Response(
      JSON.stringify({ data: connections.map(connectionToRow), error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting platform connections',
      status: 400,
    })
  }
}

export const upsertPlatformConnection = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const platform = getPlatformParam(context)

    if (platform instanceof Response) {
      return platform
    }

    const body = (await context.req.json()) as {
      credentials?: PlatformCredentials
      enabled?: boolean
    }
    const existing = await findConnection(auth, platform)
    const existingCredentials = (existing?.credentials ??
      {}) as PlatformCredentials
    // Blank fields keep their stored value, so users can update a single
    // credential without re-entering secrets
    const credentials: PlatformCredentials = { ...existingCredentials }

    for (const [key, value] of Object.entries(body.credentials ?? {})) {
      if (value?.trim()) {
        credentials[key] = value.trim()
      }
    }

    const [connection] = await auth.requestContext.db
      .insert(platformConnections)
      .values({
        credentials,
        enabled: body.enabled ?? true,
        lastError: null,
        platform,
        updatedAt: new Date(),
        userId: auth.userId,
      })
      .onConflictDoUpdate({
        set: {
          credentials,
          enabled: body.enabled ?? existing?.enabled ?? true,
          lastError: null,
          updatedAt: new Date(),
        },
        target: [platformConnections.userId, platformConnections.platform],
      })
      .returning()

    return new Response(
      JSON.stringify({ data: connectionToRow(connection), error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem saving platform connection',
      status: 400,
    })
  }
}

export const togglePlatformConnection = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const platform = getPlatformParam(context)

    if (platform instanceof Response) {
      return platform
    }

    const body = (await context.req.json()) as { enabled: boolean }
    const [connection] = await auth.requestContext.db
      .update(platformConnections)
      .set({ enabled: body.enabled, lastError: null, updatedAt: new Date() })
      .where(
        and(
          eq(platformConnections.userId, auth.userId),
          eq(platformConnections.platform, platform),
        ),
      )
      .returning()

    if (!connection) {
      return errorResponse({
        error: 'Connection not found',
        reason: 'Connection not found',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: connectionToRow(connection), error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating platform connection',
      status: 400,
    })
  }
}

export const deletePlatformConnection = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const platform = getPlatformParam(context)

    if (platform instanceof Response) {
      return platform
    }

    // Synced items go too; bookmarks created from them are kept
    await auth.requestContext.db
      .delete(platformItems)
      .where(
        and(
          eq(platformItems.userId, auth.userId),
          eq(platformItems.platform, platform),
        ),
      )
    await auth.requestContext.db
      .delete(platformConnections)
      .where(
        and(
          eq(platformConnections.userId, auth.userId),
          eq(platformConnections.platform, platform),
        ),
      )

    return new Response(JSON.stringify({ data: null, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem removing platform connection',
      status: 400,
    })
  }
}

export const syncPlatform = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const platform = getPlatformParam(context)

    if (platform instanceof Response) {
      return platform
    }

    const connection = await findConnection(auth, platform)

    if (!connection) {
      return errorResponse({
        error: 'Connection not found',
        reason: 'Connection not found',
        status: 404,
      })
    }

    const result = await syncPlatformConnection(
      auth.requestContext.db,
      connection,
    )

    return new Response(JSON.stringify({ data: result, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem syncing platform',
      status: 400,
    })
  }
}

export const getPlatformItems = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const platform = context.req.query('platform')

    if (!platform || !isPlatformId(platform)) {
      return errorResponse({
        error: `Unknown platform: ${platform}`,
        reason: 'Unknown platform',
        status: 404,
      })
    }

    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
    } = apiParameters(searchParamsToObject(context.req.url))
    const where = and(
      eq(platformItems.userId, auth.userId),
      eq(platformItems.platform, platform),
    )
    const [{ value: total }] = await auth.requestContext.db
      .select({ value: count() })
      .from(platformItems)
      .where(where)
    const data = await auth.requestContext.db
      .select()
      .from(platformItems)
      .where(where)
      .orderBy(
        order === 'asc'
          ? asc(platformItems.createdAt)
          : desc(platformItems.createdAt),
      )
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: total ?? 0,
          data: data.map(itemToRow),
          limit,
          offset,
          path: context.req.url,
        }),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting platform items',
      status: 400,
    })
  }
}

export const convertPlatformItemToBookmark = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const id = context.req.param('id')

    if (!id) {
      return errorResponse({ reason: 'Missing item id', status: 400 })
    }

    const item = await auth.requestContext.db.query.platformItems.findFirst({
      where: and(
        eq(platformItems.id, id),
        eq(platformItems.userId, auth.userId),
      ),
    })

    if (!item) {
      return errorResponse({
        error: 'Item not found',
        reason: 'Item not found or access denied',
        status: 404,
      })
    }

    if (item.bookmarkId) {
      const [existing] = await auth.requestContext.db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.id, item.bookmarkId))
        .limit(1)

      if (existing) {
        return new Response(
          JSON.stringify({ data: bookmarkToRow(existing), error: null }),
          { headers: API_HEADERS, status: 200 },
        )
      }
    }

    const [bookmark] = await auth.requestContext.db
      .insert(bookmarks)
      .values({
        description: item.description,
        image: item.image,
        tags: [item.platform],
        title: item.title,
        type: item.platform === 'youtube' ? 'video' : 'link',
        url: item.url,
        user: auth.userId,
      })
      .returning()

    await auth.requestContext.db
      .update(platformItems)
      .set({ bookmarkId: bookmark.id })
      .where(eq(platformItems.id, item.id))

    return new Response(
      JSON.stringify({ data: bookmarkToRow(bookmark), error: null }),
      { headers: API_HEADERS, status: 201 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem creating bookmark from item',
      status: 400,
    })
  }
}
