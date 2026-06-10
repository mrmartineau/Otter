import { and, desc, eq, ne, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS } from '@/constants'
import type { Journal, JournalEntry, JournalStatus } from '@/types/db'
import { getErrorMessage } from '@/utils/get-error-message'
import type { Db } from '../../db/client'
import { journalEntries, journals } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type JournalRow = typeof journals.$inferSelect
type JournalEntryRow = typeof journalEntries.$inferSelect

const journalToRow = (item: JournalRow): Journal => ({
  created_at: item.createdAt?.toISOString() ?? null,
  description: item.description,
  id: item.id,
  name: item.name,
  owner: item.owner,
  status: item.status,
})

const journalEntryToRow = (
  item: JournalEntryRow,
  journal?: JournalRow | null,
): JournalEntry => ({
  created_at: item.createdAt?.toISOString() ?? null,
  date: item.date,
  end_date: item.endDate,
  entry: item.entry,
  id: item.id,
  journal: item.journal,
  journals: journal ? { id: journal.id, name: journal.name } : null,
  media: item.media,
  owner: item.owner,
  status: item.status,
  time: item.time,
})

const getJournalContext = async (context: HonoContext) => {
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

const errorResponse = (error: unknown, reason: string) => {
  return new Response(
    JSON.stringify({
      data: null,
      error: getErrorMessage(error),
      reason,
    }),
    {
      headers: API_HEADERS,
      status: 400,
    },
  )
}

const notFoundResponse = (reason: string) => {
  return new Response(
    JSON.stringify({
      data: null,
      error: reason,
      reason,
    }),
    {
      headers: API_HEADERS,
      status: 404,
    },
  )
}

const toJournalSet = (body: Record<string, unknown>) => {
  const values: Partial<typeof journals.$inferInsert> = {}

  if ('description' in body)
    values.description = body.description as string | null
  if ('name' in body) values.name = body.name as string
  if ('status' in body) values.status = body.status as typeof values.status

  return values
}

const toJournalEntrySet = (body: Record<string, unknown>) => {
  const values: Partial<typeof journalEntries.$inferInsert> = {}

  if ('date' in body) values.date = body.date as string | null
  if ('end_date' in body) values.endDate = body.end_date as string | null
  if ('entry' in body) values.entry = body.entry as string | null
  if ('journal' in body)
    values.journal = body.journal != null ? Number(body.journal) : null
  if ('media' in body) values.media = body.media as string[] | null
  if ('status' in body) values.status = body.status as typeof values.status
  if ('time' in body) values.time = body.time as string | null

  return values
}

const userOwnsJournal = async (db: Db, journalId: number, userId: string) => {
  const [item] = await db
    .select({ id: journals.id })
    .from(journals)
    .where(and(eq(journals.id, journalId), eq(journals.owner, userId)))
    .limit(1)

  return Boolean(item)
}

/**
 * GET /api/journals
 * Returns the user's journals (active by default).
 */
export const getJournals = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const status =
      (context.req.query('status') as JournalStatus | undefined) ?? 'active'
    const data = await auth.requestContext.db
      .select()
      .from(journals)
      .where(and(eq(journals.owner, auth.userId), eq(journals.status, status)))
      .orderBy(journals.name)

    return new Response(
      JSON.stringify({
        count: data.length,
        data: data.map((item) => journalToRow(item)),
        error: null,
      }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem getting journals')
  }
}

export const createJournal = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const [item] = await auth.requestContext.db
      .insert(journals)
      .values({
        ...toJournalSet(body),
        name: (body.name as string) ?? '',
        owner: auth.userId,
      })
      .returning()

    return new Response(
      JSON.stringify({ data: journalToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem creating journal')
  }
}

export const updateJournal = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const [item] = await auth.requestContext.db
      .update(journals)
      .set(toJournalSet(body))
      .where(
        and(
          eq(journals.id, Number(context.req.param('id'))),
          eq(journals.owner, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return notFoundResponse('Journal not found or access denied')
    }

    return new Response(
      JSON.stringify({ data: journalToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem updating journal')
  }
}

/**
 * DELETE /api/journals/:id
 * Soft-deletes a journal by setting its status to 'deleted'.
 */
export const deleteJournal = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const [item] = await auth.requestContext.db
      .update(journals)
      .set({ status: 'deleted' })
      .where(
        and(
          eq(journals.id, Number(context.req.param('id'))),
          eq(journals.owner, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return notFoundResponse('Journal not found or access denied')
    }

    return new Response(
      JSON.stringify({ data: journalToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem deleting journal')
  }
}

/**
 * GET /api/journal-entries
 * Returns the user's journal entries (active by default), newest first.
 * Optional query params: journal (journal id), status.
 */
export const getJournalEntries = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const journalParam = context.req.query('journal')
    const status =
      (context.req.query('status') as JournalStatus | undefined) ?? 'active'
    const conditions = [
      eq(journalEntries.owner, auth.userId),
      eq(journalEntries.status, status),
    ]

    if (journalParam) {
      conditions.push(eq(journalEntries.journal, Number(journalParam)))
    }

    const data = await auth.requestContext.db
      .select()
      .from(journalEntries)
      .leftJoin(
        journals,
        and(
          eq(journalEntries.journal, journals.id),
          eq(journals.owner, auth.userId),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        sql`${journalEntries.date} desc nulls last`,
        desc(journalEntries.createdAt),
      )

    return new Response(
      JSON.stringify({
        count: data.length,
        data: data.map((item) =>
          journalEntryToRow(item.journal_entries, item.journals),
        ),
        error: null,
      }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem getting journal entries')
  }
}

export const getJournalEntry = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const [item] = await auth.requestContext.db
      .select()
      .from(journalEntries)
      .leftJoin(
        journals,
        and(
          eq(journalEntries.journal, journals.id),
          eq(journals.owner, auth.userId),
        ),
      )
      .where(
        and(
          eq(journalEntries.id, Number(context.req.param('id'))),
          eq(journalEntries.owner, auth.userId),
          ne(journalEntries.status, 'deleted'),
        ),
      )
      .limit(1)

    if (!item) {
      return notFoundResponse('Journal entry not found or access denied')
    }

    return new Response(
      JSON.stringify({
        data: journalEntryToRow(item.journal_entries, item.journals),
        error: null,
      }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem getting journal entry')
  }
}

export const createJournalEntry = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const values = toJournalEntrySet(body)

    if (
      values.journal != null &&
      !(await userOwnsJournal(
        auth.requestContext.db,
        values.journal,
        auth.userId,
      ))
    ) {
      return notFoundResponse('Journal not found or access denied')
    }

    const [item] = await auth.requestContext.db
      .insert(journalEntries)
      .values({
        ...values,
        owner: auth.userId,
      })
      .returning()

    return new Response(
      JSON.stringify({ data: journalEntryToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem creating journal entry')
  }
}

export const updateJournalEntry = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const body = (await context.req.json()) as Record<string, unknown>
    const values = toJournalEntrySet(body)

    if (
      values.journal != null &&
      !(await userOwnsJournal(
        auth.requestContext.db,
        values.journal,
        auth.userId,
      ))
    ) {
      return notFoundResponse('Journal not found or access denied')
    }

    const [item] = await auth.requestContext.db
      .update(journalEntries)
      .set(values)
      .where(
        and(
          eq(journalEntries.id, Number(context.req.param('id'))),
          eq(journalEntries.owner, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return notFoundResponse('Journal entry not found or access denied')
    }

    return new Response(
      JSON.stringify({ data: journalEntryToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem updating journal entry')
  }
}

/**
 * DELETE /api/journal-entries/:id
 * Soft-deletes a journal entry by setting its status to 'deleted'.
 */
export const deleteJournalEntry = async (context: HonoContext) => {
  try {
    const auth = await getJournalContext(context)

    if (auth instanceof Response) {
      return auth
    }

    const [item] = await auth.requestContext.db
      .update(journalEntries)
      .set({ status: 'deleted' })
      .where(
        and(
          eq(journalEntries.id, Number(context.req.param('id'))),
          eq(journalEntries.owner, auth.userId),
        ),
      )
      .returning()

    if (!item) {
      return notFoundResponse('Journal entry not found or access denied')
    }

    return new Response(
      JSON.stringify({ data: journalEntryToRow(item), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse(error, 'Problem deleting journal entry')
  }
}
