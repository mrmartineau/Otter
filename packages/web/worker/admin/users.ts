import { count, desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { API_HEADERS } from '@/constants'
import type { AdminUser } from '@/types/db'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { authUsers, bookmarks, profiles } from '../../db/schema'
import { requireAdminContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * GET /api/admin/users
 * Lists every user with their plan, role and bookmark count. Admin-only.
 */
export const listUsers = async (context: HonoContext) => {
  try {
    const requestContext = await requireAdminContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const rows = await requestContext.db
      .select({
        bookmarkCount: count(bookmarks.id),
        createdAt: authUsers.createdAt,
        email: authUsers.email,
        id: authUsers.id,
        name: authUsers.name,
        override: profiles.dailyBookmarkLimitOverride,
        plan: profiles.plan,
        role: profiles.role,
        subscriptionStatus: profiles.subscriptionStatus,
        username: profiles.username,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(profiles.id, authUsers.id))
      .leftJoin(bookmarks, eq(bookmarks.user, authUsers.id))
      .groupBy(
        authUsers.id,
        authUsers.email,
        authUsers.name,
        authUsers.createdAt,
        profiles.username,
        profiles.role,
        profiles.plan,
        profiles.subscriptionStatus,
        profiles.dailyBookmarkLimitOverride,
      )
      .orderBy(desc(authUsers.createdAt))

    const data: AdminUser[] = rows.map((row) => ({
      bookmark_count: row.bookmarkCount,
      created_at: row.createdAt.toISOString(),
      daily_bookmark_limit_override: row.override,
      email: row.email,
      id: row.id,
      name: row.name,
      plan: row.plan ?? 'free',
      role: row.role ?? 'user',
      subscription_status: row.subscriptionStatus ?? 'inactive',
      username: row.username,
    }))

    return new Response(JSON.stringify({ data, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem listing users',
      status: 400,
    })
  }
}

const updateUserSchema = z
  .object({
    daily_bookmark_limit_override: z.number().int().min(0).nullable(),
    role: z.enum(['user', 'admin']),
  })
  .partial()

/**
 * PATCH /api/admin/users/:id
 * Updates a user's role or per-user daily bookmark limit. Admin-only.
 */
export const updateUserAdmin = async (context: HonoContext) => {
  try {
    const requestContext = await requireAdminContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    const id = context.req.param('id')

    if (!id) {
      return errorResponse({ reason: 'Missing user id', status: 400 })
    }

    const parsed = updateUserSchema.safeParse(await context.req.json())

    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'Invalid user update payload',
        status: 400,
      })
    }

    // Guard against an admin removing their own access.
    if (parsed.data.role === 'user' && id === requestContext.user?.id) {
      return errorResponse({
        error: 'You cannot remove your own admin role',
        reason: 'Self-demotion is not allowed',
        status: 400,
      })
    }

    const update: Partial<typeof profiles.$inferInsert> = {}
    if (parsed.data.role !== undefined) {
      update.role = parsed.data.role
    }
    if (parsed.data.daily_bookmark_limit_override !== undefined) {
      update.dailyBookmarkLimitOverride =
        parsed.data.daily_bookmark_limit_override
    }

    if (Object.keys(update).length === 0) {
      return errorResponse({ reason: 'No fields to update', status: 400 })
    }

    update.updatedAt = new Date()

    await requestContext.db
      .update(profiles)
      .set(update)
      .where(eq(profiles.id, id))

    return new Response(JSON.stringify({ data: { id }, error: null }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating user',
      status: 400,
    })
  }
}
