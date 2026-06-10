import { and, asc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { feedSubscriptions } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { discoverFeed } from './discover'
import { buildOpml, parseOpml } from './opml'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type FeedSubscriptionRow = typeof feedSubscriptions.$inferSelect

const subscriptionToRow = (row: FeedSubscriptionRow) => ({
  created_at: row.createdAt.toISOString(),
  description: row.description,
  feed_url: row.feedUrl,
  folder: row.folder,
  id: row.id,
  site_url: row.siteUrl,
  title: row.title,
  updated_at: row.updatedAt?.toISOString() ?? null,
})

const createSubscriptionSchema = z.object({
  folder: z.string().trim().min(1).nullish(),
  title: z.string().trim().min(1).nullish(),
  url: z.string().trim().min(1),
})

const updateSubscriptionSchema = z
  .object({
    folder: z.string().trim().nullable().optional(),
    title: z.string().trim().min(1).optional(),
  })
  .refine(
    (update) => update.folder !== undefined || update.title !== undefined,
    { message: 'Nothing to update' },
  )

const importOpmlSchema = z.object({
  opml: z.string().min(1),
})

export const listFeedSubscriptions = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const rows = await requestContext.db
      .select()
      .from(feedSubscriptions)
      .where(eq(feedSubscriptions.userId, userId))
      .orderBy(asc(feedSubscriptions.folder), asc(feedSubscriptions.title))

    return new Response(
      JSON.stringify({
        count: rows.length,
        data: rows.map(subscriptionToRow),
        error: null,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem listing feed subscriptions',
      status: 400,
    })
  }
}

export const getFeedSubscription = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const id = context.req.param('id')
    if (!id) {
      return errorResponse({
        reason: 'Feed subscription not found',
        status: 404,
      })
    }

    const [row] = await requestContext.db
      .select()
      .from(feedSubscriptions)
      .where(
        and(eq(feedSubscriptions.id, id), eq(feedSubscriptions.userId, userId)),
      )
      .limit(1)

    if (!row) {
      return errorResponse({
        reason: 'Feed subscription not found',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: subscriptionToRow(row), error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting feed subscription',
      status: 400,
    })
  }
}

export const createFeedSubscription = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const parsed = createSubscriptionSchema.safeParse(await context.req.json())
    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'A feed or site url is required',
        status: 400,
      })
    }

    const discovered = await discoverFeed(parsed.data.url)
    if (!discovered) {
      return errorResponse({
        reason: 'No RSS or Atom feed found at that URL',
        status: 404,
      })
    }

    const [row] = await requestContext.db
      .insert(feedSubscriptions)
      .values({
        description: discovered.description,
        feedUrl: discovered.feedUrl,
        folder: parsed.data.folder ?? null,
        siteUrl: discovered.siteUrl,
        title: parsed.data.title ?? discovered.title ?? discovered.feedUrl,
        userId,
      })
      .onConflictDoNothing({
        target: [feedSubscriptions.userId, feedSubscriptions.feedUrl],
      })
      .returning()

    if (!row) {
      return errorResponse({
        reason: 'Already subscribed to this feed',
        status: 409,
      })
    }

    return new Response(
      JSON.stringify({ data: subscriptionToRow(row), error: null }),
      { headers: API_HEADERS, status: 201 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem subscribing to feed',
      status: 400,
    })
  }
}

export const updateFeedSubscription = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const parsed = updateSubscriptionSchema.safeParse(await context.req.json())
    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'Invalid feed subscription update payload',
        status: 400,
      })
    }

    const id = context.req.param('id')
    if (!id) {
      return errorResponse({
        reason: 'Feed subscription not found',
        status: 404,
      })
    }

    const update: Partial<FeedSubscriptionRow> = { updatedAt: new Date() }
    if (parsed.data.title !== undefined) {
      update.title = parsed.data.title
    }
    if (parsed.data.folder !== undefined) {
      update.folder = parsed.data.folder || null
    }

    const [row] = await requestContext.db
      .update(feedSubscriptions)
      .set(update)
      .where(
        and(eq(feedSubscriptions.id, id), eq(feedSubscriptions.userId, userId)),
      )
      .returning()

    if (!row) {
      return errorResponse({
        reason: 'Feed subscription not found',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: subscriptionToRow(row), error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating feed subscription',
      status: 400,
    })
  }
}

export const deleteFeedSubscription = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const id = context.req.param('id')
    if (!id) {
      return errorResponse({
        reason: 'Feed subscription not found',
        status: 404,
      })
    }

    await requestContext.db
      .delete(feedSubscriptions)
      .where(
        and(eq(feedSubscriptions.id, id), eq(feedSubscriptions.userId, userId)),
      )

    return new Response(JSON.stringify({ ok: true }), {
      headers: API_HEADERS,
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem deleting feed subscription',
      status: 400,
    })
  }
}

export const importOpml = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const parsed = importOpmlSchema.safeParse(await context.req.json())
    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'An OPML document is required',
        status: 400,
      })
    }

    const feeds = parseOpml(parsed.data.opml)
    if (!feeds.length) {
      return errorResponse({
        reason: 'No feeds found in the OPML document',
        status: 400,
      })
    }

    const inserted = await requestContext.db
      .insert(feedSubscriptions)
      .values(
        feeds.map((feed) => ({
          feedUrl: feed.feedUrl,
          folder: feed.folder,
          siteUrl: feed.siteUrl,
          title: feed.title ?? feed.feedUrl,
          userId,
        })),
      )
      .onConflictDoNothing({
        target: [feedSubscriptions.userId, feedSubscriptions.feedUrl],
      })
      .returning()

    return new Response(
      JSON.stringify({
        added: inserted.length,
        error: null,
        skipped: feeds.length - inserted.length,
        total: feeds.length,
      }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem importing OPML',
      status: 400,
    })
  }
}

export const exportOpml = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:read',
    ])
    if (requestContext instanceof Response) return requestContext

    const userId = requestContext.user?.id
    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const rows = await requestContext.db
      .select()
      .from(feedSubscriptions)
      .where(eq(feedSubscriptions.userId, userId))
      .orderBy(asc(feedSubscriptions.folder), asc(feedSubscriptions.title))

    const opml = buildOpml(
      rows.map((row) => ({
        feedUrl: row.feedUrl,
        folder: row.folder,
        siteUrl: row.siteUrl,
        title: row.title,
      })),
    )

    return new Response(opml, {
      headers: {
        'Content-Disposition':
          'attachment; filename="otter-subscriptions.opml"',
        'Content-Type': 'text/x-opml; charset=utf-8',
      },
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem exporting OPML',
      status: 400,
    })
  }
}
