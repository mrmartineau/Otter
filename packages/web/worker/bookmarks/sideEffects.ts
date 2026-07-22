import type { Context } from 'hono'
import type { BaseBookmark } from '@/types/db'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

type BookmarkWebhookPayload = {
  old_record?: BaseBookmark | null
  record: BaseBookmark
  type: 'INSERT' | 'UPDATE'
}

const shouldRunPublicBookmarkSideEffects = ({
  old_record: oldRecord,
  record,
  type,
}: BookmarkWebhookPayload) => {
  if (record.status !== 'active' || !record.public || !record.url) {
    return false
  }

  if (type === 'UPDATE' && oldRecord?.public) {
    return false
  }

  return true
}

export const scheduleBookmarkSideEffects = (
  context: HonoContext,
  payload: BookmarkWebhookPayload,
) => {
  if (!shouldRunPublicBookmarkSideEffects(payload)) {
    return
  }

  const webhookSecret = context.env.WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn('Bookmark side effects skipped: WEBHOOK_SECRET is not set')
    return
  }

  const origin = new URL(context.req.url).origin
  const body = JSON.stringify(payload)
  const tasks = Promise.allSettled([
    fetch(`${origin}/api/bluesky`, {
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-otter-webhook-secret': webhookSecret,
      },
      method: 'POST',
    }),
    fetch(`${origin}/api/toot`, {
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-otter-webhook-secret': webhookSecret,
      },
      method: 'POST',
    }),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Bookmark side effect failed:', result.reason)
      }
    }
  })

  context.executionCtx.waitUntil(tasks)
}
