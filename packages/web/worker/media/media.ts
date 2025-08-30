import type { HonoRequest } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import type { Media, MediaStatus, MediaType } from '@/types/db'
import { getErrorMessage } from '@/utils/get-error-message'
import { createAuthenticatedClient } from '../supabase/client'

/**
 * GET /api/media
 * Returns media items grouped by type, then by status, ordered by sort_order.
 * Requires Authorization header with a valid API key (Bearer token).
 */
export const getMedia = async (request: HonoRequest<'/api/media'>) => {
  try {
    // @ts-expect-error - TODO: fix this
    const { client } = await createAuthenticatedClient(request)

    const url = new URL(request.url)
    const limitParam =
      url.searchParams.get('limit') ?? DEFAULT_API_RESPONSE_LIMIT
    const statusesParam = url.searchParams.get('statuses')
    const includeEmptyParam = url.searchParams.get('includeEmpty')

    const { data, error } = await client
      .from('media')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }) // TODO: this might not be needed

    if (error) {
      throw error
    }

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

    // Parse limit and statuses
    const parsedLimit = Number(limitParam)
    const perStatusLimit = Number.isFinite(parsedLimit)
      ? Math.max(0, parsedLimit)
      : undefined
    const requestedStatuses: readonly MediaStatus[] = statusesParam
      ? (statusesParam
          .split(',')
          .map((s) => s.trim() as MediaStatus)
          .filter((s): s is MediaStatus =>
            (statusOrder as readonly string[]).includes(s)
          ) as readonly MediaStatus[])
      : statusOrder

    // Group items by type, then by status. Build keys dynamically
    type Grouped = Partial<
      Record<MediaType, Partial<Record<MediaStatus, Media[]>>>
    >
    const grouped: Grouped = {}

    for (const item of data || []) {
      const mediaType: MediaType = (item.type as MediaType) || 'other'
      const mediaStatus: MediaStatus =
        (item.status as MediaStatus) || 'wishlist'

      // Respect requested statuses filter while grouping
      if (!requestedStatuses.includes(mediaStatus)) continue

      const typeBucket = grouped[mediaType] || {}
      grouped[mediaType] = typeBucket
      const statusBucket = typeBucket[mediaStatus] || []
      typeBucket[mediaStatus] = statusBucket
      statusBucket.push(item)
    }

    // Apply per-status limit if provided
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

    // Ensure consistent key ordering for types, and include only requested statuses
    const includeEmpty =
      includeEmptyParam === 'true' ||
      includeEmptyParam === '1' ||
      includeEmptyParam === 'yes'

    const ordered: Partial<
      Record<MediaType, Partial<Record<MediaStatus, Media[]>>>
    > = {}

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
      }
    )
  }
}
