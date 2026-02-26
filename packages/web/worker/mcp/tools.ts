import type { SupabaseClient } from '@supabase/supabase-js'
import { TidyURL } from 'tidy-url'
import type { Database } from '@/types/supabase'
import { getBookmarks } from '@/utils/fetching/bookmarks'
import { getDbMetadata } from '@/utils/fetching/meta'
import { getSearchBookmarks } from '@/utils/fetching/search'
import { matchTagsSource } from '@/utils/matchTags'
import { linkType } from '../scraper/link-type'
import Scraper from '../scraper/scraper'
import { scraperRules } from '../scraper/scraper-rules'
import {
  type CallToolResult,
  type McpToolDefinition,
  toolError,
  toolResult,
} from './types'

type Bookmark = Database['public']['Tables']['bookmarks']['Row']

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
  client: SupabaseClient<Database>
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

// --- Formatting helpers ---

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
  count: number | null,
): string {
  if (!bookmarks.length) return 'No bookmarks found.'
  const header = `Found ${count ?? bookmarks.length} bookmark${(count ?? bookmarks.length) !== 1 ? 's' : ''}:\n`
  return header + bookmarks.map((b, i) => formatBookmark(b, i + 1)).join('\n\n')
}

function clampLimit(val: unknown): number {
  const n = Number(val) || 19
  return Math.min(Math.max(1, n), MAX_LIMIT)
}

// --- Tool definitions and handlers ---

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
    const { data, count, error } = await getSearchBookmarks({
      params: {
        limit: clampLimit(args.limit),
        star: args.star as boolean | undefined,
        status: (args.status as 'active' | 'inactive') || undefined,
        tag: args.tag as string | undefined,
        type: args.type as string | undefined,
      },
      searchTerm: args.query as string,
      supabaseClient: ctx.client,
      userId: ctx.userId,
    })
    if (error) return toolError(`Search failed: ${error.message}`)
    return toolResult(formatBookmarkList(data || [], count))
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
      const { data, count } = await getBookmarks(
        {
          limit: clampLimit(args.limit),
          offset: Number(args.offset) || 0,
          public: args.public as boolean | undefined,
          star: args.star as boolean | undefined,
          status: (args.status as 'active' | 'inactive') || undefined,
          tag: args.tag as string | undefined,
          top: args.top as boolean | undefined,
          type: args.type as string | undefined,
        },
        ctx.client,
        ctx.userId,
      )
      return toolResult(formatBookmarkList(data || [], count))
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
    const { data, error } = await ctx.client
      .from('tags_count')
      .select('*')
      .order('count', { ascending: false })
    if (error) return toolError(`Failed to list tags: ${error.message}`)
    if (!data?.length) return toolResult('No tags found.')
    const lines = data.map((t) => `${t.tag} (${t.count ?? 0})`)
    return toolResult(`${data.length} tags:\n${lines.join('\n')}`)
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
      const meta = await getDbMetadata(ctx.client)
      const lines = [
        `Bookmarks: ${meta.all} total, ${meta.stars} starred, ${meta.public} public, ${meta.trash} in trash, ${meta.top} with clicks`,
        '',
        'Types:',
        ...(meta.types || []).map((t) => `  ${t.type}: ${t.count}`),
        '',
        `Tags: ${meta.tags?.length ?? 0} unique tags`,
        '',
        'Collections:',
        ...(meta.collections || []).map(
          (c) => `  ${c.collection}: ${c.bookmark_count} bookmarks`,
        ),
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

    // Build a base query to get count
    let countQuery = ctx.client
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user', ctx.userId)
      .eq('status', 'active')
    if (args.type) countQuery = countQuery.eq('type', args.type as string)
    if (args.tag) countQuery = countQuery.filter('tags', 'cs', `{${args.tag}}`)

    const { count, error: countError } = await countQuery
    if (countError) return toolError(`Failed to count: ${countError.message}`)
    if (!count || count === 0) return toolResult('No matching bookmarks found.')

    // Pick random offsets and fetch individual bookmarks
    const results: Bookmark[] = []
    const usedOffsets = new Set<number>()
    const maxAttempts = Math.min(requestedCount, count)

    for (let i = 0; i < maxAttempts; i++) {
      let offset: number
      do {
        offset = Math.floor(Math.random() * count)
      } while (usedOffsets.has(offset) && usedOffsets.size < count)
      usedOffsets.add(offset)

      let query = ctx.client
        .from('bookmarks')
        .select('*')
        .eq('user', ctx.userId)
        .eq('status', 'active')
      if (args.type) query = query.eq('type', args.type as string)
      if (args.tag) query = query.filter('tags', 'cs', `{${args.tag}}`)
      const { data } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset)
        .limit(1)
      if (data?.[0]) results.push(data[0])
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

        // Auto-detect tags based on scraped metadata
        const dbMeta = await getDbMetadata(ctx.client)
        autoTags = matchTagsSource(
          {
            description: (metadata.description as string) || undefined,
            title: (metadata.title as string) || undefined,
          },
          dbMeta.tags,
        )
      } catch {
        // Scraping failed — continue with manual data only
        scrapedData = { url }
      }
    }

    const userTags = (args.tags as string[]) || []
    const mergedTags = [...new Set([...autoTags, ...userTags])]

    const insertData = {
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
        (args.type as string) ?? (scrapedData.type as string | null) ?? null,
      url: (scrapedData.url as string) || url,
      user: ctx.userId,
    }

    const { data, error } = await ctx.client
      .from('bookmarks')
      .insert([insertData])
      .select()

    if (error) return toolError(`Create failed: ${error.message}`)
    if (!data?.[0]) return toolError('Create succeeded but no data returned.')
    return toolResult(`Bookmark created:\n\n${formatBookmark(data[0])}`)
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
    const { id, ...updates } = args
    // Filter out undefined values
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) updateData[key] = value
    }
    updateData.modified_at = new Date().toISOString()

    if (Object.keys(updateData).length <= 1) {
      return toolError(
        'No fields to update. Provide at least one field to change.',
      )
    }

    const { data, error } = await ctx.client
      .from('bookmarks')
      .update(updateData)
      .eq('id', id as string)
      .eq('user', ctx.userId)
      .select()

    if (error) return toolError(`Update failed: ${error.message}`)
    if (!data?.length) return toolError('Bookmark not found or access denied.')
    return toolResult(`Bookmark updated:\n\n${formatBookmark(data[0])}`)
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
    const { data, error } = await ctx.client
      .from('bookmarks')
      .update({
        modified_at: new Date().toISOString(),
        status: 'inactive' as const,
      })
      .eq('id', args.id as string)
      .eq('user', ctx.userId)
      .select()

    if (error) return toolError(`Delete failed: ${error.message}`)
    if (!data?.length) return toolError('Bookmark not found or access denied.')
    return toolResult(`Bookmark moved to trash:\n\n${formatBookmark(data[0])}`)
  },
}

// --- Exports ---

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
