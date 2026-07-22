import { sql } from 'drizzle-orm'
import type { CollectionType, MetaTag, MetaType } from '@/utils/fetching/meta'
import type { Db } from '../../db/client'
import { bookmarks } from '../../db/schema'

// SQL aggregations over a user's active bookmarks. These all used to load
// every bookmark row into Worker memory and reduce in JS; they now run as
// single queries so cost stays flat as accounts grow.

export const getTagCounts = async (
  db: Db,
  userId: string,
  options?: { includeUntagged?: boolean },
): Promise<MetaTag[]> => {
  const result = await db.execute<{ count: number; tag: string }>(sql`
    SELECT t.tag AS tag, count(*)::int AS count
    FROM ${bookmarks}, LATERAL unnest(${bookmarks.tags}) AS t(tag)
    WHERE ${bookmarks.user} = ${userId} AND ${bookmarks.status} = 'active'
    GROUP BY t.tag
    ORDER BY count DESC, tag ASC
  `)
  const tags: MetaTag[] = result.rows.map((row) => ({
    count: row.count,
    tag: row.tag,
  }))

  if (options?.includeUntagged) {
    const untagged = await db.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
      FROM ${bookmarks}
      WHERE ${bookmarks.user} = ${userId}
        AND ${bookmarks.status} = 'active'
        AND (${bookmarks.tags} IS NULL OR cardinality(${bookmarks.tags}) = 0)
    `)
    const count = untagged.rows[0]?.count ?? 0

    if (count > 0) {
      tags.push({ count, tag: 'Untagged' })
    }
  }

  return tags
}

export const getTypeCounts = async (
  db: Db,
  userId: string,
): Promise<MetaType[]> => {
  const result = await db.execute<{
    count: number
    type: MetaType['type']
  }>(sql`
    SELECT ${bookmarks.type} AS type, count(*)::int AS count
    FROM ${bookmarks}
    WHERE ${bookmarks.user} = ${userId}
      AND ${bookmarks.status} = 'active'
      AND ${bookmarks.type} IS NOT NULL
    GROUP BY ${bookmarks.type}
    ORDER BY count DESC, type ASC
  `)

  return result.rows.map((row) => ({ count: row.count, type: row.type }))
}

// A collection is the prefix of any tag formatted `<name>:<rest>`
// (`ai:openai` → `ai`). Tags without a colon are not collections, but a
// bookmark tagged with a bare `name` still counts towards collection `name`
// if that collection exists.
export const getCollections = async (
  db: Db,
  userId: string,
): Promise<CollectionType[]> => {
  const result = await db.execute<{
    bookmark_count: number
    collection: string
    tags: string[]
  }>(sql`
    WITH user_tags AS (
      SELECT ${bookmarks.id} AS id, t.tag AS tag
      FROM ${bookmarks}, LATERAL unnest(${bookmarks.tags}) AS t(tag)
      WHERE ${bookmarks.user} = ${userId} AND ${bookmarks.status} = 'active'
    ),
    collections AS (
      SELECT DISTINCT split_part(tag, ':', 1) AS collection
      FROM user_tags
      WHERE strpos(tag, ':') > 1
    ),
    tag_lists AS (
      SELECT c.collection,
        array_agg(DISTINCT ut.tag ORDER BY ut.tag) AS tags
      FROM collections c
      JOIN user_tags ut
        ON left(ut.tag, length(c.collection) + 1) = c.collection || ':'
      GROUP BY c.collection
    ),
    counts AS (
      SELECT c.collection, count(DISTINCT ut.id)::int AS bookmark_count
      FROM collections c
      JOIN user_tags ut
        ON ut.tag = c.collection
        OR left(ut.tag, length(c.collection) + 1) = c.collection || ':'
      GROUP BY c.collection
    )
    SELECT counts.collection, counts.bookmark_count, tag_lists.tags
    FROM counts
    JOIN tag_lists ON tag_lists.collection = counts.collection
    ORDER BY counts.bookmark_count DESC, counts.collection ASC
  `)

  return result.rows.map((row) => ({
    bookmark_count: row.bookmark_count,
    collection: row.collection,
    tags: row.tags,
  }))
}

// A tag belongs to collection `name` when it equals `name` or starts with
// `<name>:`. `left(...)` comparison avoids LIKE-escaping issues for tags
// containing `%` or `_`.
export const collectionMatchCondition = (name: string) => sql`EXISTS (
  SELECT 1 FROM unnest(${bookmarks.tags}) AS t(tag)
  WHERE t.tag = ${name}
    OR left(t.tag, ${name.length + 1}) = ${`${name}:`}
)`
