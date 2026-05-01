import { and, arrayContains, count, desc, eq, ilike, or } from 'drizzle-orm'
import { TidyURL } from 'tidy-url'
import type { BookmarkStatus, BookmarkType } from '@/types/db'
import { matchTagsSource } from '@/utils/matchTags'
import { bookmarks } from '../../db/schema'
import { bookmarkToRow } from '../bookmarks/mapper'
import type { RequestContext } from '../context'
import { linkType } from '../scraper/link-type'
import Scraper from '../scraper/scraper'
import { scraperRules } from '../scraper/scraper-rules'
import {
  type CallToolResult,
  type McpToolDefinition,
  toolError,
  toolResult,
} from './types'

type Bookmark = ReturnType<typeof bookmarkToRow>

const BOOKMARK_TYPES = [
  'link',
  'video',
  'audio',
  'recipe',
  'image',
  'document',
  'article',
  'game',
  'book',
  'event',
  'product',
  'note',
  'file',
  'place',
] as const

const MAX_LIMIT = 50
const MAX_RANDOM = 10

const typeEnumSchema = {
  enum: BOOKMARK_TYPES,
  type: 'string',
} as const

interface ToolContext {
  requestContext: RequestContext
  userId: string
}

type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<CallToolResult>

interface McpTool {
  definition: McpToolDefinition
  handler: ToolHandler
}

function formatBookmark(b: Bookmark, index?: number): string {
  const prefix = index !== undefined ? `${index}. ` : ''
  const lines: string[] = []
  lines.push(`${prefix}${b.title || '(untitled)'}`)
  if (b.url) lines.push(`   ${b.url}`)
  if (b.description) lines.push(`   ${b.description}`)
  if (b.note) lines.push(`   Note: ${b.note}`)
  const meta: string[] = []
  if (b.tags?.length) meta.push(`Tags: ${b.tags.join(', ')}`)
  if (b.star) meta.push('★ Starred')
  if (b.public) meta.push('Public')
  if (b.type) meta.push(`Type: ${b.type}`)
  meta.push(`Created: ${b.created_at.split('T')[0]}`)
  if (meta.length) lines.push(`   ${meta.join(' | ')}`)
  lines.push(`   ID: ${b.id}`)
  return lines.join('\n')
}

function formatBookmarkList(
  bookmarks: Bookmark[],
  total: number | null,
): string {
  if (!bookmarks.length) return 'No bookmarks found.'
  const countLabel = total ?? bookmarks.length
  const header = `Found ${countLabel} bookmark${countLabel !== 1 ? 's' : ''}:\n`
  return header + bookmarks.map((b, i) => formatBookmark(b, i + 1)).join('\n\n')
}

function clampLimit(val: unknown): number {
  const n = Number(val) || 19
  return Math.min(Math.max(1, n), MAX_LIMIT)
}

const bookmarkFilters = (
  userId: string,
  args: Record<string, unknown>,
  searchTerm?: string,
) =>
  and(
    eq(bookmarks.user, userId),
    eq(bookmarks.status, (args.status as BookmarkStatus) || 'active'),
    args.type ? eq(bookmarks.type, args.type as BookmarkType) : undefined,
    typeof args.star === 'boolean' ? eq(bookmarks.star, args.star) : undefined,
    typeof args.public === 'boolean'
      ? eq(bookmarks.public, args.public)
      : undefined,
    args.tag ? arrayContains(bookmarks.tags, [args.tag as string]) : undefined,
    searchTerm
      ? or(
          ilike(bookmarks.title, `%${searchTerm}%`),
          ilike(bookmarks.url, `%${searchTerm}%`),
          ilike(bookmarks.description, `%${searchTerm}%`),
          ilike(bookmarks.note, `%${searchTerm}%`),
          arrayContains(bookmarks.tags, [searchTerm]),
        )
      : undefined,
  )

const listBookmarkRows = async (
  ctx: ToolContext,
  args: Record<string, unknown>,
  searchTerm?: string,
) => {
  const limit = clampLimit(args.limit)
  const offset = Number(args.offset) || 0
  const top = Boolean(args.top)
  const where = bookmarkFilters(ctx.userId, args, searchTerm)
  const [{ value: total }] = await ctx.requestContext.db
    .select({ value: count() })
    .from(bookmarks)
    .where(where)
  const data = await ctx.requestContext.db
    .select()
    .from(bookmarks)
    .where(where)
    .orderBy(
      ...(top
        ? [desc(bookmarks.clickCount), desc(bookmarks.createdAt)]
        : [desc(bookmarks.createdAt)]),
    )
    .limit(limit)
    .offset(offset)

  return { data: data.map(bookmarkToRow), total }
}

const getTagCounts = async (ctx: ToolContext) => {
  const rows = await ctx.requestContext.db
    .select({ tags: bookmarks.tags })
    .from(bookmarks)
    .where(and(eq(bookmarks.user, ctx.userId), eq(bookmarks.status, 'active')))
  const counts = new Map<string, number>()

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([tag, count]) => ({ count, tag })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  )
}

const getTypeCounts = async (ctx: ToolContext) => {
  const rows = await ctx.requestContext.db
    .select({ type: bookmarks.type })
    .from(bookmarks)
    .where(and(eq(bookmarks.user, ctx.userId), eq(bookmarks.status, 'active')))
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (row.type) {
      counts.set(row.type, (counts.get(row.type) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([type, count]) => ({ count, type }))
}

const searchBookmarks: McpTool = {
  definition: {
    description:
      'Search bookmarks by text across title, URL, description, note, and tags.',
    inputSchema: {
      properties: {
        limit: {
          description: 'Max results (default: 19, max: 50)',
          type: 'number',
        },
        query: { description: 'Search term', type: 'string' },
        star: { description: 'Only starred bookmarks', type: 'boolean' },
        status: {
          description: 'Filter by status (default: active)',
          enum: ['active', 'inactive'],
          type: 'string',
        },
        tag: { description: 'Filter by tag', type: 'string' },
        type: { ...typeEnumSchema, description: 'Filter by bookmark type' },
      },
      required: ['query'],
      type: 'object',
    },
    name: 'search_bookmarks',
  },
  handler: async (args, ctx) => {
    try {
      const { data, total } = await listBookmarkRows(
        ctx,
        args,
        args.query as string,
      )
      return toolResult(formatBookmarkList(data, total))
    } catch (err) {
      return toolError(
        `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  },
}

const listBookmarks: McpTool = {
  definition: {
    description:
      'List bookmarks with filters (no text search). Use search_bookmarks for text search.',
    inputSchema: {
      properties: {
        limit: {
          description: 'Max results (default: 19, max: 50)',
          type: 'number',
        },
        offset: {
          description: 'Pagination offset (default: 0)',
          type: 'number',
        },
        public: { description: 'Only public bookmarks', type: 'boolean' },
        star: { description: 'Only starred bookmarks', type: 'boolean' },
        status: {
          description: 'Filter by status (default: active)',
          enum: ['active', 'inactive'],
          type: 'string',
        },
        tag: { description: 'Filter by tag', type: 'string' },
        top: {
          description: 'Sort by click count (most clicked first)',
          type: 'boolean',
        },
        type: { ...typeEnumSchema, description: 'Filter by bookmark type' },
      },
      type: 'object',
    },
    name: 'list_bookmarks',
  },
  handler: async (args, ctx) => {
    try {
      const { data, total } = await listBookmarkRows(ctx, args)
      return toolResult(formatBookmarkList(data, total))
    } catch (err) {
      return toolError(
        `List failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  },
}

const listTags: McpTool = {
  definition: {
    description: 'List all tags with usage counts.',
    inputSchema: { properties: {}, type: 'object' },
    name: 'list_tags',
  },
  handler: async (_args, ctx) => {
    const tags = await getTagCounts(ctx)
    if (!tags.length) return toolResult('No tags found.')
    const lines = tags.map((t) => `${t.tag} (${t.count ?? 0})`)
    return toolResult(`${tags.length} tags:\n${lines.join('\n')}`)
  },
}

const getStats: McpTool = {
  definition: {
    description:
      'Get database overview: total bookmarks, starred, public, trash counts, type breakdown, and collections.',
    inputSchema: { properties: {}, type: 'object' },
    name: 'get_stats',
  },
  handler: async (_args, ctx) => {
    try {
      const [all, top, publicItems, stars, trash, types, tags] =
        await Promise.all([
          listBookmarkRows(ctx, { limit: 1, status: 'active' }),
          listBookmarkRows(ctx, { limit: 1, status: 'active', top: true }),
          listBookmarkRows(ctx, {
            limit: 1,
            public: true,
            status: 'active',
          }),
          listBookmarkRows(ctx, { limit: 1, star: true, status: 'active' }),
          listBookmarkRows(ctx, { limit: 1, status: 'inactive' }),
          getTypeCounts(ctx),
          getTagCounts(ctx),
        ])
      const collections = tags
        .filter((tag) => tag.tag.startsWith('collection:'))
        .map((tag) => `  ${tag.tag.replace('collection:', '')}: ${tag.count}`)
      const lines = [
        `Bookmarks: ${all.total} total, ${stars.total} starred, ${publicItems.total} public, ${trash.total} in trash, ${top.total} with clicks`,
        '',
        'Types:',
        ...types.map((t) => `  ${t.type}: ${t.count}`),
        '',
        `Tags: ${tags.length} unique tags`,
        '',
        'Collections:',
        ...(collections.length ? collections : ['  none']),
      ]
      return toolResult(lines.join('\n'))
    } catch (err) {
      return toolError(
        `Stats failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  },
}

const randomBookmark: McpTool = {
  definition: {
    description: 'Get random bookmark(s) matching optional filters.',
    inputSchema: {
      properties: {
        count: {
          description: 'Number of random bookmarks (default: 1, max: 10)',
          type: 'number',
        },
        tag: { description: 'Filter by tag', type: 'string' },
        type: { ...typeEnumSchema, description: 'Filter by bookmark type' },
      },
      type: 'object',
    },
    name: 'random_bookmark',
  },
  handler: async (args, ctx) => {
    const requestedCount = Math.min(
      Math.max(1, Number(args.count) || 1),
      MAX_RANDOM,
    )
    const where = bookmarkFilters(ctx.userId, args)
    const [{ value: total }] = await ctx.requestContext.db
      .select({ value: count() })
      .from(bookmarks)
      .where(where)

    if (!total) return toolResult('No matching bookmarks found.')

    const results: Bookmark[] = []
    const usedOffsets = new Set<number>()
    const maxAttempts = Math.min(requestedCount, total)

    for (let i = 0; i < maxAttempts; i++) {
      let offset: number
      do {
        offset = Math.floor(Math.random() * total)
      } while (usedOffsets.has(offset) && usedOffsets.size < total)
      usedOffsets.add(offset)

      const [bookmark] = await ctx.requestContext.db
        .select()
        .from(bookmarks)
        .where(where)
        .orderBy(desc(bookmarks.createdAt))
        .limit(1)
        .offset(offset)

      if (bookmark) results.push(bookmarkToRow(bookmark))
    }

    if (!results.length) return toolResult('No bookmarks found.')
    return toolResult(formatBookmarkList(results, results.length))
  },
}

const createBookmark: McpTool = {
  definition: {
    description:
      'Create a new bookmark. By default, automatically fetches title, description, tags, and type from the URL.',
    inputSchema: {
      properties: {
        description: {
          description: 'Description (overrides scraped description)',
          type: 'string',
        },
        note: { description: 'Personal note', type: 'string' },
        public: { description: 'Make publicly visible', type: 'boolean' },
        scrape: {
          description:
            'Auto-fetch metadata from URL (default: true). Set false to skip.',
          type: 'boolean',
        },
        star: { description: 'Star the bookmark', type: 'boolean' },
        tags: {
          description: 'Tags (merged with auto-detected tags)',
          items: { type: 'string' },
          type: 'array',
        },
        title: {
          description: 'Title (overrides scraped title)',
          type: 'string',
        },
        type: {
          ...typeEnumSchema,
          description: 'Bookmark type (overrides detected type)',
        },
        url: { description: 'Bookmark URL', type: 'string' },
      },
      required: ['url'],
      type: 'object',
    },
    name: 'create_bookmark',
  },
  handler: async (args, ctx) => {
    const url = args.url as string
    const shouldScrape = args.scrape !== false
    let scrapedData: Record<string, unknown> = {}
    let autoTags: string[] = []

    if (shouldScrape) {
      try {
        const scraper = new Scraper()
        await scraper.fetch(url)
        const metadata = await scraper.getMetadata(scraperRules)
        const unshortenedUrl = scraper.response.url
        const cleanedUrl = TidyURL.clean(unshortenedUrl || url)

        scrapedData = {
          description: metadata.description || null,
          feed: metadata.feeds || null,
          image: metadata.image || null,
          title: metadata.title || null,
          type: linkType(url, false),
          url: cleanedUrl.url || unshortenedUrl || url,
        }

        const tags = await getTagCounts(ctx)
        autoTags = matchTagsSource(
          {
            description: (metadata.description as string) || undefined,
            title: (metadata.title as string) || undefined,
          },
          tags,
        )
      } catch {
        scrapedData = { url }
      }
    }

    const userTags = (args.tags as string[]) || []
    const mergedTags = [...new Set([...autoTags, ...userTags])]
    const [bookmark] = await ctx.requestContext.db
      .insert(bookmarks)
      .values({
        description:
          (args.description as string) ??
          (scrapedData.description as string | null),
        feed: scrapedData.feed as string | null,
        image: scrapedData.image as string | null,
        note: (args.note as string) || null,
        public: (args.public as boolean) || false,
        star: (args.star as boolean) || false,
        tags: mergedTags.length ? mergedTags : null,
        title: (args.title as string) ?? (scrapedData.title as string | null),
        type:
          (args.type as BookmarkType) ??
          (scrapedData.type as BookmarkType | null),
        url: (scrapedData.url as string) || url,
        user: ctx.userId,
      })
      .returning()

    if (!bookmark) return toolError('Create succeeded but no data returned.')
    return toolResult(
      `Bookmark created:\n\n${formatBookmark(bookmarkToRow(bookmark))}`,
    )
  },
}

const updateBookmark: McpTool = {
  definition: {
    description: 'Update an existing bookmark by ID.',
    inputSchema: {
      properties: {
        description: { description: 'New description', type: 'string' },
        id: { description: 'Bookmark UUID', type: 'string' },
        note: { description: 'New note', type: 'string' },
        public: { description: 'Make public/private', type: 'boolean' },
        star: { description: 'Star/unstar', type: 'boolean' },
        status: {
          description: 'Set to inactive to trash',
          enum: ['active', 'inactive'],
          type: 'string',
        },
        tags: {
          description: 'New tags (replaces existing)',
          items: { type: 'string' },
          type: 'array',
        },
        title: { description: 'New title', type: 'string' },
        type: { ...typeEnumSchema, description: 'New type' },
      },
      required: ['id'],
      type: 'object',
    },
    name: 'update_bookmark',
  },
  handler: async (args, ctx) => {
    const updateData: Partial<typeof bookmarks.$inferInsert> = {
      modifiedAt: new Date(),
    }

    if (typeof args.description === 'string')
      updateData.description = args.description
    if (typeof args.note === 'string') updateData.note = args.note
    if (typeof args.public === 'boolean') updateData.public = args.public
    if (typeof args.star === 'boolean') updateData.star = args.star
    if (typeof args.status === 'string')
      updateData.status = args.status as BookmarkStatus
    if (Array.isArray(args.tags)) updateData.tags = args.tags as string[]
    if (typeof args.title === 'string') updateData.title = args.title
    if (typeof args.type === 'string')
      updateData.type = args.type as BookmarkType

    if (Object.keys(updateData).length <= 1) {
      return toolError(
        'No fields to update. Provide at least one field to change.',
      )
    }

    const [bookmark] = await ctx.requestContext.db
      .update(bookmarks)
      .set(updateData)
      .where(
        and(
          eq(bookmarks.id, args.id as string),
          eq(bookmarks.user, ctx.userId),
        ),
      )
      .returning()

    if (!bookmark) return toolError('Bookmark not found or access denied.')
    return toolResult(
      `Bookmark updated:\n\n${formatBookmark(bookmarkToRow(bookmark))}`,
    )
  },
}

const deleteBookmark: McpTool = {
  definition: {
    description:
      'Soft-delete a bookmark by moving it to trash (sets status to inactive).',
    inputSchema: {
      properties: {
        id: { description: 'Bookmark UUID', type: 'string' },
      },
      required: ['id'],
      type: 'object',
    },
    name: 'delete_bookmark',
  },
  handler: async (args, ctx) => {
    const [bookmark] = await ctx.requestContext.db
      .update(bookmarks)
      .set({
        modifiedAt: new Date(),
        status: 'inactive',
      })
      .where(
        and(
          eq(bookmarks.id, args.id as string),
          eq(bookmarks.user, ctx.userId),
        ),
      )
      .returning()

    if (!bookmark) return toolError('Bookmark not found or access denied.')
    return toolResult(
      `Bookmark moved to trash:\n\n${formatBookmark(bookmarkToRow(bookmark))}`,
    )
  },
}

export const tools: McpTool[] = [
  searchBookmarks,
  listBookmarks,
  listTags,
  getStats,
  randomBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
]

export const toolDefinitions: McpToolDefinition[] = tools.map(
  (t) => t.definition,
)

export const toolHandlers: Record<string, ToolHandler> = Object.fromEntries(
  tools.map((t) => [t.definition.name, t.handler]),
)
