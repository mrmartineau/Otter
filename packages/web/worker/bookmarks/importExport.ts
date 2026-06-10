import { and, desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'
import { parseNetscapeBookmarks, serializeNetscapeBookmarks } from './netscape'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type BookmarkInsert = typeof bookmarks.$inferInsert

const MAX_IMPORT_BYTES = 25 * 1024 * 1024
const INSERT_CHUNK_SIZE = 200

const getAuthed = async (context: HonoContext, scopes: string[]) => {
  const requestContext = await requireRequestContext(context, scopes)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

const readImportHtml = async (context: HonoContext) => {
  const contentType = context.req.header('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await context.req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return null
    }

    if (file.size > MAX_IMPORT_BYTES) {
      throw new Error('File is too large (max 25MB)')
    }

    return await file.text()
  }

  const contentLength = Number(context.req.header('content-length'))

  if (contentLength > MAX_IMPORT_BYTES) {
    throw new Error('File is too large (max 25MB)')
  }

  const html = await context.req.text()

  if (html.length > MAX_IMPORT_BYTES) {
    throw new Error('File is too large (max 25MB)')
  }

  return html
}

/**
 * POST /api/bookmarks/import
 * Imports bookmarks from a Netscape-format `bookmarks.html` file (the
 * standard export format of Chrome, Firefox, Safari, Pinboard, etc.).
 * Accepts the file as multipart form-data (`file` field) or as a raw
 * text/html request body. Bookmarks whose URL already exists for the user
 * are skipped.
 */
export const importBookmarks = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:write'])

    if (auth instanceof Response) {
      return auth
    }

    const html = await readImportHtml(context)

    if (!html?.trim()) {
      return errorResponse({
        error: 'No file provided',
        reason: 'Upload a bookmarks HTML file as the `file` form field',
        status: 400,
      })
    }

    const parsed = parseNetscapeBookmarks(html)

    if (parsed.length === 0) {
      return errorResponse({
        error: 'No bookmarks found',
        reason:
          'The file does not look like a bookmarks HTML export — no bookmarks were found in it',
        status: 400,
      })
    }

    const existing = await auth.requestContext.db
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(eq(bookmarks.user, auth.userId))
    const existingUrls = new Set(existing.map((row) => row.url).filter(Boolean))
    const toInsert: BookmarkInsert[] = parsed
      .filter((item) => !existingUrls.has(item.url))
      .map((item) => ({
        createdAt: item.createdAt ?? undefined,
        description: item.description,
        tags: item.tags.length ? item.tags : null,
        title: item.title ?? item.url,
        type: 'link' as const,
        url: item.url,
        user: auth.userId,
      }))

    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
      await auth.requestContext.db
        .insert(bookmarks)
        .values(toInsert.slice(i, i + INSERT_CHUNK_SIZE))
    }

    return new Response(
      JSON.stringify({
        data: {
          found: parsed.length,
          imported: toInsert.length,
          skipped: parsed.length - toInsert.length,
        },
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
      reason: 'Problem importing bookmarks',
      status: 400,
    })
  }
}

/**
 * GET /api/bookmarks/export
 * Exports all the user's active bookmarks as a Netscape-format
 * `bookmarks.html` file that browsers and other bookmark managers can import.
 */
export const exportBookmarks = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context, ['bookmarks:read'])

    if (auth instanceof Response) {
      return auth
    }

    const rows = await auth.requestContext.db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.user, auth.userId), eq(bookmarks.status, 'active')),
      )
      .orderBy(desc(bookmarks.createdAt))
    const html = serializeNetscapeBookmarks(
      rows
        .filter((row) => row.url)
        .map((row) => ({
          createdAt: row.createdAt,
          description: row.description,
          modifiedAt: row.modifiedAt,
          public: row.public,
          tags: row.tags,
          title: row.title,
          url: row.url as string,
        })),
    )
    const date = new Date().toISOString().slice(0, 10)

    return new Response(html, {
      headers: {
        'Content-Disposition': `attachment; filename="otter-bookmarks-${date}.html"`,
        'Content-Type': 'text/html; charset=utf-8',
      },
      status: 200,
    })
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem exporting bookmarks',
      status: 400,
    })
  }
}
