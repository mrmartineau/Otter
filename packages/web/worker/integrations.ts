import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import type { UserIntegration } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { userIntegrations } from '../db/schema'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type IntegrationRow = typeof userIntegrations.$inferSelect

const toPublicIntegration = (row: IntegrationRow): UserIntegration => ({
  bluesky_app_password: null,
  bluesky_enabled: row.blueskyEnabled,
  bluesky_handle: row.blueskyHandle,
  bluesky_last_error: row.blueskyLastError,
  bluesky_post_prefix: row.blueskyPostPrefix,
  bluesky_post_suffix: row.blueskyPostSuffix,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt?.toISOString() ?? null,
  user_id: row.userId,
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

export const getBlueskyIntegration = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const integration =
      await auth.requestContext.db.query.userIntegrations.findFirst({
        where: eq(userIntegrations.userId, auth.userId),
      })

    return new Response(
      JSON.stringify(integration ? toPublicIntegration(integration) : null),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting integration settings',
      status: 400,
    })
  }
}

export const upsertBlueskyIntegration = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as {
      appPassword?: string
      enabled: boolean
      handle: string
      postPrefix: string
      postSuffix: string
    }
    const existing =
      await auth.requestContext.db.query.userIntegrations.findFirst({
        where: eq(userIntegrations.userId, auth.userId),
      })
    const [integration] = await auth.requestContext.db
      .insert(userIntegrations)
      .values({
        blueskyAppPassword: body.appPassword || existing?.blueskyAppPassword,
        blueskyEnabled: body.enabled,
        blueskyHandle: body.handle,
        blueskyLastError: null,
        blueskyPostPrefix: body.postPrefix || null,
        blueskyPostSuffix: body.postSuffix || null,
        updatedAt: new Date(),
        userId: auth.userId,
      })
      .onConflictDoUpdate({
        set: {
          blueskyAppPassword:
            body.appPassword || existing?.blueskyAppPassword || null,
          blueskyEnabled: body.enabled,
          blueskyHandle: body.handle,
          blueskyLastError: null,
          blueskyPostPrefix: body.postPrefix || null,
          blueskyPostSuffix: body.postSuffix || null,
          updatedAt: new Date(),
        },
        target: userIntegrations.userId,
      })
      .returning()

    return new Response(JSON.stringify(toPublicIntegration(integration)), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem saving integration settings',
      status: 400,
    })
  }
}

export const toggleBlueskyIntegration = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as { enabled: boolean }
    const [integration] = await auth.requestContext.db
      .update(userIntegrations)
      .set({
        blueskyEnabled: body.enabled,
        blueskyLastError: null,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.userId, auth.userId))
      .returning()

    if (!integration) {
      return errorResponse({
        error: 'Integration not found',
        reason: 'Integration not found',
        status: 404,
      })
    }

    return new Response(JSON.stringify(toPublicIntegration(integration)), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating integration settings',
      status: 400,
    })
  }
}
