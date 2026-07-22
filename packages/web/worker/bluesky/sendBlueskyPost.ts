import { AtpAgent, RichText } from '@atproto/api'
import { strifx, when } from '@mrmartineau/strifx'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { filteredTags } from '@/utils/filteredTags'
import { bookmarks, userIntegrations } from '../../db/schema'
import type { WorkerEnv } from '../env'
import '../middleware/db'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * POST /api/bluesky
 * Called by Otter's internal bookmark side-effect flow when a bookmark is inserted or updated.
 * Posts to Bluesky if the bookmark is newly public and the user has Bluesky enabled.
 */
export const sendBlueskyPost = async (context: HonoContext) => {
  const webhookSecret = context.req.header('x-otter-webhook-secret')
  if (!webhookSecret || webhookSecret !== context.env.WEBHOOK_SECRET) {
    return errorResponse({
      reason: 'Invalid webhook secret',
      status: 401,
    })
  }

  const body = await context.req.json()

  if (!body.type || !body?.record) {
    return errorResponse({
      reason: 'Bluesky post not sent: missing type or record',
      status: 400,
    })
  }

  // Only post if the bookmark is public and has a URL
  if (body.record.public === false || !body.record.url) {
    return errorResponse({
      reason: 'Bluesky post not sent: bookmark is not public or has no URL',
      status: 200,
    })
  }

  // For UPDATEs, only post if the bookmark was just made public
  if (body.type === 'UPDATE') {
    if (body.record.public === true && body.old_record.public === true) {
      return errorResponse({
        reason: 'Bluesky post not sent: bookmark was already public',
        status: 200,
      })
    }
  }

  // Fetch the user's Bluesky integration settings
  const db = context.var.db
  const integration = await db.query.userIntegrations.findFirst({
    where: eq(userIntegrations.userId, body.record.user),
  })

  if (!integration) {
    return errorResponse({
      reason: 'Bluesky post not sent: no integration settings found',
      status: 200,
    })
  }

  if (
    !integration.blueskyEnabled ||
    !integration.blueskyHandle ||
    !integration.blueskyAppPassword
  ) {
    return errorResponse({
      reason: 'Bluesky post not sent: integration not enabled or configured',
      status: 200,
    })
  }

  // Check idempotency: don't post if already posted for this bookmark
  if (body.record.bluesky_post_uri) {
    return errorResponse({
      reason: 'Bluesky post not sent: already posted',
      status: 200,
    })
  }

  try {
    const agent = new AtpAgent({ service: 'https://bsky.social' })
    await agent.login({
      identifier: integration.blueskyHandle,
      password: integration.blueskyAppPassword,
    })

    // Compose the post text
    const filteredTagsString = filteredTags(body.record.tags ?? [])
    const postText = strifx`${when(integration.blueskyPostPrefix, { suffix: ' ' })}${body.record.title ?? ''}${when(body.record.description, { prefix: ' — ' })}${when(filteredTagsString, { prefix: '\n', test: (v: string) => v.length > 0 })}${when(integration.blueskyPostSuffix, { prefix: '\n' })}`

    // Parse rich text for facets (links, mentions, hashtags)
    const richText = new RichText({ text: postText })
    await richText.detectFacets(agent)

    // Build the embed with bookmark metadata
    const embed: {
      $type: string
      external: {
        uri: string
        title: string
        description: string
        thumb?: unknown
      }
    } = {
      $type: 'app.bsky.embed.external',
      external: {
        description: body.record.description ?? '',
        title: body.record.title ?? '',
        uri: body.record.url,
      },
    }

    // Upload thumbnail if the bookmark has an image
    if (body.record.image) {
      try {
        const imageResponse = await fetch(body.record.image)
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const contentType =
            imageResponse.headers.get('content-type') ?? 'image/jpeg'
          const { data: blobData } = await agent.uploadBlob(
            new Uint8Array(imageBuffer),
            { encoding: contentType },
          )
          embed.external.thumb = blobData.blob
        }
      } catch (imageError) {
        // Continue without thumbnail
        console.error('Failed to upload thumbnail:', imageError)
      }
    }

    const response = await agent.post({
      embed,
      facets: richText.facets,
      text: richText.text,
    })

    // Store the post URI on the bookmark for idempotency
    await db
      .update(bookmarks)
      .set({ blueskyPostUri: response.uri })
      .where(eq(bookmarks.id, body.record.id))

    return new Response(JSON.stringify({ success: true, uri: response.uri }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Bluesky post failed:', error)

    const isAuthError =
      error instanceof Error &&
      (error.message.includes('Authentication') ||
        error.message.includes('Invalid identifier or password'))

    // Disable integration on auth errors so the user sees it in settings
    if (isAuthError) {
      await db
        .update(userIntegrations)
        .set({
          blueskyEnabled: false,
          blueskyLastError:
            'Authentication failed. Please check your handle and app password.',
        })
        .where(eq(userIntegrations.userId, body.record.user))
    }

    return errorResponse({
      reason: `Bluesky post failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 500,
    })
  }
}
