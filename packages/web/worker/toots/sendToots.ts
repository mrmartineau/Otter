import type { Context } from 'hono'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { filteredTags } from '@/utils/filteredTags'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

/**
 * /api/toot
 * This endpoint sends toots to 2 Mastodon accounts
 */
export const sendToots = async (context: HonoContext) => {
  const webhookSecret = context.req.header('x-otter-webhook-secret')
  const isWebhookRequest =
    webhookSecret &&
    context.env.WEBHOOK_SECRET &&
    webhookSecret === context.env.WEBHOOK_SECRET

  if (!isWebhookRequest) {
    const requestContext = await requireRequestContext(context)

    if (requestContext instanceof Response) {
      return requestContext
    }

    if (!requestContext.user?.id) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }
  }

  const body = await context.req.json()

  // don't continue if the request doesn't have a type or record
  if (!body.type && !body?.record) {
    return errorResponse({ reason: 'Toot not sent 😞', status: 418 })
  }

  // don't continue if the record isn't public
  // or if the record doesn't have a url
  if (body.record.public === false || !body.record.url) {
    return errorResponse({ reason: 'Toot not sent 😞', status: 418 })
  }

  // Only
  if (body.type === 'UPDATE') {
    if (
      // other content might have changed, but the bookmark is still is public
      // so there's no need to send a toot
      body.record.public === true &&
      body.old_record.public === true
    ) {
      return errorResponse({
        reason: 'UPDATE: this bookmark is already public. Toot not sent 😞',
        status: 418,
      })
    }
  }

  const filteredTagsString = filteredTags(body.record.tags)
  const tagsString =
    filteredTagsString.length > 0 ? `${filteredTagsString}` : ''
  const descriptionString =
    body.record.description?.length > 0 ? ` - ${body.record.description}` : ''
  const personalAccessToken = context.env.PERSONAL_MASTODON_ACCESS_TOKEN
  const botAccessToken = context.env.BOT_MASTODON_ACCESS_TOKEN

  if (!personalAccessToken || !botAccessToken) {
    return errorResponse({
      reason: 'Toot not sent: Mastodon access token missing',
      status: 500,
    })
  }

  // send mastodon toot to personal account
  const tootContent = `"${body.record.title}"${descriptionString}\n${body.record.url}\n${tagsString} • New #${body.record.type} just added to #Otter.`
  await fetch(`https://toot.cafe/api/v1/statuses`, {
    body: new URLSearchParams({
      access_token: personalAccessToken,
      status: tootContent,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  // send mastodon toot to bot account
  const botTootContent = `New #${body.record.type}: "${body.record.title}"${descriptionString}\n${body.record.url}\n${tagsString}`
  await fetch(`https://botsin.space/api/v1/statuses`, {
    body: new URLSearchParams({
      access_token: botAccessToken,
      status: botTootContent,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  return new Response('Toots sent!')
}
