import { and, desc, eq, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Media, MediaStatus, MediaType } from '@/types/db'
import { getErrorMessage } from '@/utils/get-error-message'
import { media } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type GroupedMedia = Partial<
  Record<MediaType, Partial<Record<MediaStatus, Media[]>>>
>
type MediaRow = typeof media.$inferSelect

const mediaToRow = (item: MediaRow): Media => ({
  created_at: item.createdAt.toISOString(),
  id: item.id,
  image: item.image,
  media_id: item.mediaId,
  modified_at: item.modifiedAt?.toISOString() ?? null,
  name: item.name,
  platform: item.platform,
  rating: item.rating,
  sort_order: item.sortOrder,
  status: item.status,
  type: item.type,
  user: item.user,
})

const getMediaContext = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return new Response(
      JSON.stringify({
        data: null,
        error: 'Not authorised',
        reason: 'Not authorised',
      }),
      {
        headers: API_HEADERS,
        status: 401,
      },
    )
  }

  return { requestContext, userId }
}

const toMediaSet = (body: Record<string, unknown>) => {
  const values: Partial<typeof media.$inferInsert> = {}

  if ('image' in body) values.image = body.image as string | null
  if ('media_id' in body) values.mediaId = body.media_id as string | null
  if ('name' in body) values.name = body.name as string
  if ('platform' in body) values.platform = body.platform as string | null
  if ('rating' in body) values.rating = body.rating as typeof values.rating
  if ('sort_order' in body) values.sortOrder = body.sort_order as number | null
  if ('status' in body) values.status = body.status as typeof values.status
  if ('type' in body) values.type = body.type as typeof values.type

  return values
}

/**
 * GET /api/media
 * Returns media items grouped by type, then by status, ordered by sort_order.
 */
export const getMedia = async (context: HonoContext) => {
  try {
    const auth = await getMediaContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const url = new URL(context.req.url)
    const limitParam =
      url.searchParams.get('limit') ?? DEFAULT_API_RESPONSE_LIMIT
    const statusesParam = url.searchParams.get('statuses')
    const includeEmptyParam = url.searchParams.get('includeEmpty')
    const data = await auth.requestContext.db
      .select()
      .from(media)
      .where(eq(media.user, auth.userId))
      .orderBy(sql`${media.sortOrder} asc nulls last`, desc(media.createdAt))
    const typeOrder: readonly MediaType[] = [
      'tv',
      'film',
      'game',
      'book',
      'podcast',
      'music',
      'other',
    ]
    const statusOrder: readonly MediaStatus[] = [
      'wishlist',
      'now',
      'skipped',
      'done',
    ]
    const parsedLimit = Number(limitParam)
    const perStatusLimit = Number.isFinite(parsedLimit)
      ? Math.max(0, parsedLimit)
      : undefined
    const requestedStatuses: readonly MediaStatus[] = statusesParam
      ? (statusesParam
          .split(',')
          .map((s) => s.trim() as MediaStatus)
          .filter((s): s is MediaStatus =>
            (statusOrder as readonly string[]).includes(s),
          ) as readonly MediaStatus[])
      : statusOrder
    const grouped: GroupedMedia = {}

    for (const item of data.map(mediaToRow)) {
      const mediaType: MediaType = item.type || 'other'
      const mediaStatus: MediaStatus = item.status || 'wishlist'

      if (!requestedStatuses.includes(mediaStatus)) continue

      const typeBucket = grouped[mediaType] || {}
      grouped[mediaType] = typeBucket
      const statusBucket = typeBucket[mediaStatus] || []
      typeBucket[mediaStatus] = statusBucket
      statusBucket.push(item)
    }

    if (typeof perStatusLimit === 'number') {
      for (const t of Object.keys(grouped) as MediaType[]) {
        const typeBucket = grouped[t]
        if (!typeBucket) continue
        for (const s of Object.keys(typeBucket) as MediaStatus[]) {
          const arr = typeBucket[s]
          if (!arr) continue
          typeBucket[s] = arr.slice(0, perStatusLimit)
        }
      }
    }

    const includeEmpty =
      includeEmptyParam === 'true' ||
      includeEmptyParam === '1' ||
      includeEmptyParam === 'yes'
    const ordered: GroupedMedia = {}

    for (const t of typeOrder) {
      const typeBucket = grouped[t] || {}
      const statusEntries: Partial<Record<MediaStatus, Media[]>> = {}

      for (const s of statusOrder) {
        if (!requestedStatuses.includes(s)) continue
        const arr = typeBucket[s] || []
        if (includeEmpty || arr.length > 0) {
          statusEntries[s] = arr
        }
      }

      if (includeEmpty || Object.keys(statusEntries).length > 0) {
        ordered[t] = statusEntries
      }
    }

    return new Response(JSON.stringify(ordered), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem getting media',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}
export const getMediaItem = async (context: HonoContext) => {
  try {
    const auth = await getMediaContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const [item] = await auth.requestContext.db
      .select()
      .from(media)
      .where(
        and(
          eq(media.id, Number(context.req.param('id'))),
          eq(media.user, auth.userId),
        ),
      )
      .limit(1)

    if (!item) {
      return new Response(
        JSON.stringify({
          data: null,
          error: 'Media item not found',
          reason: 'Media item not found or access denied',
        }),
        {
          headers: API_HEADERS,
          status: 404,
        },
      )
    }

    return new Response(
      JSON.stringify({ data: mediaToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem getting media item',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}

export const createMedia = async (context: HonoContext) => {
  try {
    const auth = await getMediaContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const [item] = await auth.requestContext.db
      .insert(media)
      .values({
        ...toMediaSet(body),
        user: auth.userId,
      })
      .returning()

    return new Response(
      JSON.stringify({ data: mediaToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem creating media item',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}

export const updateMedia = async (context: HonoContext) => {
  try {
    const auth = await getMediaContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const [item] = await auth.requestContext.db
      .update(media)
      .set({
        ...toMediaSet(body),
        modifiedAt: new Date(),
      })
      .where(
        and(
          eq(media.id, Number(context.req.param('id'))),
          eq(media.user, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return new Response(
        JSON.stringify({
          data: null,
          error: 'Media item not found',
          reason: 'Media item not found or access denied',
        }),
        {
          headers: API_HEADERS,
          status: 404,
        },
      )
    }

    return new Response(
      JSON.stringify({ data: mediaToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem updating media item',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}

export const deleteMedia = async (context: HonoContext) => {
  try {
    const auth = await getMediaContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const [item] = await auth.requestContext.db
      .delete(media)
      .where(
        and(
          eq(media.id, Number(context.req.param('id'))),
          eq(media.user, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return new Response(
        JSON.stringify({
          data: null,
          error: 'Media item not found',
          reason: 'Media item not found or access denied',
        }),
        {
          headers: API_HEADERS,
          status: 404,
        },
      )
    }

    return new Response(
      JSON.stringify({ data: mediaToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    return new Response(
      JSON.stringify({
        data: null,
        error: errorMessage,
        reason: 'Problem deleting media item',
      }),
      {
        headers: API_HEADERS,
        status: 400,
      },
    )
  }
}
