import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { profiles } from '../db/schema'
import { API_HEADERS } from '../src/constants'
import { errorResponse } from '../src/utils/fetching/errorResponse'
import { getErrorMessage } from '../src/utils/get-error-message'
import { getProfileById, requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

const updateProfileSchema = z.discriminatedUnion('column', [
  z.object({ column: z.literal('settings_tags_visible'), value: z.boolean() }),
  z.object({ column: z.literal('settings_types_visible'), value: z.boolean() }),
  z.object({
    column: z.literal('settings_collections_visible'),
    value: z.boolean(),
  }),
  z.object({ column: z.literal('settings_group_by_date'), value: z.boolean() }),
  z.object({
    column: z.literal('settings_top_tags_count'),
    value: z.number().nullable(),
  }),
  z.object({
    column: z.literal('settings_pinned_tags'),
    value: z.array(z.string()),
  }),
  z.object({ column: z.literal('username'), value: z.string().min(3) }),
  z.object({ column: z.literal('avatar_url'), value: z.string().nullable() }),
])

const getProfileUpdate = (update: z.infer<typeof updateProfileSchema>) => {
  switch (update.column) {
    case 'avatar_url':
      return { avatarUrl: update.value }
    case 'settings_collections_visible':
      return { settingsCollectionsVisible: update.value }
    case 'settings_group_by_date':
      return { settingsGroupByDate: update.value }
    case 'settings_pinned_tags':
      return { settingsPinnedTags: update.value }
    case 'settings_tags_visible':
      return { settingsTagsVisible: update.value }
    case 'settings_top_tags_count':
      return { settingsTopTagsCount: update.value }
    case 'settings_types_visible':
      return { settingsTypesVisible: update.value }
    case 'username':
      return { username: update.value }
  }
}

export const getCurrentProfile = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    return new Response(JSON.stringify({ data: requestContext.profile }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting user profile',
      status: 400,
    })
  }
}

export const updateCurrentProfile = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const parsed = updateProfileSchema.safeParse(await context.req.json())

    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'Invalid profile update payload',
        status: 400,
      })
    }

    const userId = requestContext.user?.id

    if (!userId) {
      return errorResponse({
        error: 'Authentication required',
        reason: 'Missing or invalid session/API key',
        status: 401,
      })
    }

    await requestContext.db
      .update(profiles)
      .set({
        ...getProfileUpdate(parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userId))

    const profile = await getProfileById(requestContext.db, userId)

    return new Response(
      JSON.stringify({
        data: profile,
        error: null,
      }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating user profile',
      status: 400,
    })
  }
}
