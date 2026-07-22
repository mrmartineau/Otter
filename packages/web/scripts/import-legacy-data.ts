/**
 * Import legacy SQL dump data into the target Postgres database.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/import-legacy-data.ts [options]
 *
 * Options:
 *   --reset           Truncate target tables before importing (idempotent re-run)
 *   --dry-run         Parse and validate source data without writing to DB
 *   --copy-passwords  Copy legacy bcrypt password hashes into Better Auth accounts.
 *                     Omit this flag to create accounts with no password (forces reset).
 *   --dump <path>     Path to SQL dump (default: ./legacy-export/data.sql)
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const args = process.argv.slice(2)
const RESET = args.includes('--reset')
const DRY_RUN = args.includes('--dry-run')
const COPY_PASSWORDS = args.includes('--copy-passwords')
const dumpFlagIdx = args.indexOf('--dump')
const DUMP_PATH = resolve(
  process.cwd(),
  dumpFlagIdx >= 0 ? args[dumpFlagIdx + 1] : 'legacy-export/data.sql',
)

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required')
  process.exit(1)
}

type ParsedTable = {
  columns: string[]
  rows: Record<string, string | null>[]
}

function parseCopyBlock(
  content: string,
  schema: string,
  table: string,
): ParsedTable {
  const schemaPattern = `(?:"${schema}"|${schema})`
  const tablePattern = `(?:"${table}"|${table})`
  const copyPattern = new RegExp(
    `COPY ${schemaPattern}\\.${tablePattern} \\(([^)]+)\\) FROM stdin;`,
  )

  const match = content.match(copyPattern)
  if (!match) {
    return { columns: [], rows: [] }
  }

  const columns = match[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))

  const blockStart = content.indexOf(match[0]) + match[0].length + 1
  const blockEnd = content.indexOf('\n\\.', blockStart)
  if (blockEnd === -1) {
    return { columns, rows: [] }
  }

  const dataBlock = content.slice(blockStart, blockEnd)
  const rows: Record<string, string | null>[] = []

  for (const line of dataBlock.split('\n')) {
    if (line.length === 0) continue
    const fields = line.split('\t')
    const row: Record<string, string | null> = {}
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = unescapeCopyValue(fields[i] ?? '\\N')
    }
    rows.push(row)
  }

  return { columns, rows }
}

function unescapeCopyValue(raw: string): string | null {
  if (raw === '\\N') return null
  return raw.replace(/\\([\\\tnrbfv])/g, (_, ch: string) => {
    switch (ch) {
      case '\\':
        return '\\'
      case 't':
        return '\t'
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 'b':
        return '\b'
      case 'f':
        return '\f'
      case 'v':
        return '\v'
      default:
        return ch
    }
  })
}

function parseBool(v: string | null): boolean | null {
  if (v === null) return null
  return v === 't'
}

function parseArray(v: string | null): string[] | null {
  if (v === null) return null
  if (v === '{}') return []
  const inner = v.slice(1, -1)
  if (inner.length === 0) return []

  const result: string[] = []
  let i = 0
  while (i < inner.length) {
    if (inner[i] === '"') {
      let end = i + 1
      while (end < inner.length) {
        if (inner[end] === '\\') {
          end += 2
        } else if (inner[end] === '"') {
          break
        } else {
          end++
        }
      }
      result.push(
        inner
          .slice(i + 1, end)
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\'),
      )
      i = end + 2
    } else {
      const commaIdx = inner.indexOf(',', i)
      if (commaIdx === -1) {
        result.push(inner.slice(i))
        break
      }
      result.push(inner.slice(i, commaIdx))
      i = commaIdx + 1
    }
  }
  return result
}

function parseNum(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function parseTimestamp(v: string | null): Date | null {
  if (v === null) return null
  return new Date(v)
}

async function batchInsert(
  pool: Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 500,
): Promise<number> {
  if (rows.length === 0) return 0
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const placeholders = batch
      .map(
        (_, rowIdx) =>
          `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`,
      )
      .join(', ')
    const values = batch.flat()
    await pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values,
    )
    inserted += batch.length
  }
  return inserted
}

async function importUsers(
  pool: Pool,
  dump: string,
): Promise<{ count: number; userMap: Map<string, string> }> {
  const { rows } = parseCopyBlock(dump, 'auth', 'users')
  if (rows.length === 0) {
    console.warn('  [warn] No auth.users rows found in dump')
    return { count: 0, userMap: new Map() }
  }

  const userMap = new Map<string, string>()
  const userRows: unknown[][] = []
  const accountRows: unknown[][] = []

  for (const r of rows) {
    const id = r['id']
    const email = r['email']
    const encryptedPassword = r['encrypted_password']
    const emailConfirmedAt = r['email_confirmed_at']
    const createdAt = r['created_at']
    const updatedAt = r['updated_at']
    const rawUserMeta = r['raw_user_meta_data']
    const isAnonymous = r['is_anonymous']

    if (!id || !email) continue
    if (parseBool(isAnonymous)) continue

    const name = (() => {
      if (!rawUserMeta) return email
      try {
        const meta = JSON.parse(rawUserMeta)
        return meta.full_name ?? meta.name ?? email
      } catch {
        return email
      }
    })()

    userMap.set(id, id)
    userRows.push([
      id,
      email,
      name,
      emailConfirmedAt ? true : false,
      parseTimestamp(createdAt) ?? new Date(),
      parseTimestamp(updatedAt) ?? new Date(),
    ])

    const accountId = randomUUID()
    const password =
      COPY_PASSWORDS && encryptedPassword
        ? encryptedPassword.replace(/^\$2a\$/, '$2b$')
        : null
    accountRows.push([
      accountId,
      id,
      'credential',
      email,
      password,
      parseTimestamp(createdAt) ?? new Date(),
      parseTimestamp(updatedAt) ?? new Date(),
    ])
  }

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      '"user"',
      ['id', 'email', 'name', 'email_verified', 'created_at', 'updated_at'],
      userRows,
    )
    await batchInsert(
      pool,
      'account',
      [
        'id',
        'user_id',
        'provider_id',
        'account_id',
        'password',
        'created_at',
        'updated_at',
      ],
      accountRows,
    )
  }

  return { count: userRows.length, userMap }
}

async function importProfiles(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'profiles')
  const insertRows: unknown[][] = []

  for (const r of rows) {
    insertRows.push([
      r['id'],
      r['username'],
      r['avatar_url'],
      parseTimestamp(r['updated_at']),
      parseBool(r['settings_tags_visible']) ?? false,
      parseBool(r['settings_types_visible']) ?? false,
      parseBool(r['settings_group_by_date']) ?? false,
      parseNum(r['settings_top_tags_count']),
      parseArray(r['settings_pinned_tags']),
      parseBool(r['settings_collections_visible']) ?? false,
      r['api_key'],
    ])
  }

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'profiles',
      [
        'id',
        'username',
        'avatar_url',
        'updated_at',
        'settings_tags_visible',
        'settings_types_visible',
        'settings_group_by_date',
        'settings_top_tags_count',
        'settings_pinned_tags',
        'settings_collections_visible',
        'api_key',
      ],
      insertRows,
    )
  }

  return insertRows.length
}

async function importTags(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'tags')
  const insertRows = rows.map((r) => [r['id'], r['tag']])

  if (!DRY_RUN) {
    await batchInsert(pool, 'tags', ['id', 'tag'], insertRows)
  }
  return insertRows.length
}

async function importFeeds(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'feeds')
  const insertRows = rows.map((r) => [
    parseNum(r['id']),
    parseTimestamp(r['created_at']),
    r['url'],
    r['type'],
    r['properties'],
    r['name'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'feeds',
      ['id', 'created_at', 'url', 'type', 'properties', 'name'],
      insertRows,
    )
  }
  return insertRows.length
}

async function importBookmarks(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'bookmarks')
  const insertRows = rows.map((r) => [
    r['id'],
    r['title'],
    r['url'],
    r['description'],
    parseArray(r['tags']),
    parseTimestamp(r['created_at']),
    parseTimestamp(r['modified_at']),
    r['note'],
    parseBool(r['star']) ?? false,
    r['status'] ?? 'active',
    parseNum(r['click_count']) ?? 0,
    r['type'] ?? 'link',
    r['image'],
    r['tweet'],
    r['feed'],
    r['user'],
    parseBool(r['public']) ?? false,
    r['bluesky_post_uri'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'bookmarks',
      [
        'id',
        'title',
        'url',
        'description',
        'tags',
        'created_at',
        'modified_at',
        'note',
        'star',
        'status',
        'click_count',
        'type',
        'image',
        'tweet',
        'feed',
        '"user"',
        'public',
        'bluesky_post_uri',
      ],
      insertRows,
    )
  }
  return insertRows.length
}

async function importMedia(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'media')
  const insertRows = rows.map((r) => [
    parseNum(r['id']),
    parseTimestamp(r['created_at']),
    r['name'] ?? '',
    r['media_id'],
    r['type'],
    r['status'] ?? 'wishlist',
    parseTimestamp(r['modified_at']),
    r['rating'],
    parseNum(r['sort_order']),
    r['platform'],
    r['user'],
    r['image'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'media',
      [
        'id',
        'created_at',
        'name',
        'media_id',
        'type',
        'status',
        'modified_at',
        'rating',
        'sort_order',
        'platform',
        '"user"',
        'image',
      ],
      insertRows,
    )
  }
  return insertRows.length
}

async function importToots(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'toots')
  const insertRows = rows.map((r) => [
    r['id'],
    parseTimestamp(r['created_at']),
    r['text'] ?? '',
    r['urls'],
    r['toot_id'],
    r['user_id'],
    r['user_name'],
    r['user_avatar'],
    r['toot_url'],
    r['media'],
    r['reply'],
    parseArray(r['hashtags']),
    parseBool(r['liked_toot']) ?? false,
    r['db_user_id'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'toots',
      [
        'id',
        'created_at',
        'text',
        'urls',
        'toot_id',
        'user_id',
        'user_name',
        'user_avatar',
        'toot_url',
        'media',
        'reply',
        'hashtags',
        'liked_toot',
        'db_user_id',
      ],
      insertRows,
    )
  }
  return insertRows.length
}

async function importTweets(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'tweets')
  const insertRows = rows.map((r) => [
    r['id'],
    parseTimestamp(r['created_at']),
    r['text'] ?? '',
    r['urls'],
    r['tweet_id'],
    r['user_id'],
    r['user_name'],
    r['user_avatar'],
    r['tweet_url'],
    r['media'],
    r['reply'],
    parseArray(r['hashtags']),
    parseBool(r['liked_tweet']) ?? false,
    r['db_user_id'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'tweets',
      [
        'id',
        'created_at',
        'text',
        'urls',
        'tweet_id',
        'user_id',
        'user_name',
        'user_avatar',
        'tweet_url',
        'media',
        'reply',
        'hashtags',
        'liked_tweet',
        'db_user_id',
      ],
      insertRows,
    )
  }
  return insertRows.length
}

async function importUserIntegrations(
  pool: Pool,
  dump: string,
): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'user_integrations')
  const insertRows = rows.map((r) => [
    r['user_id'],
    parseBool(r['bluesky_enabled']) ?? false,
    r['bluesky_handle'],
    r['bluesky_app_password'],
    r['bluesky_last_error'],
    parseTimestamp(r['created_at']),
    parseTimestamp(r['updated_at']),
    r['bluesky_post_prefix'],
    r['bluesky_post_suffix'],
  ])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'user_integrations',
      [
        'user_id',
        'bluesky_enabled',
        'bluesky_handle',
        'bluesky_app_password',
        'bluesky_last_error',
        'created_at',
        'updated_at',
        'bluesky_post_prefix',
        'bluesky_post_suffix',
      ],
      insertRows,
    )
  }
  return insertRows.length
}

async function importBookmarkTags(pool: Pool, dump: string): Promise<number> {
  const { rows } = parseCopyBlock(dump, 'public', 'bookmark_tags')
  const insertRows = rows.map((r) => [r['bookmark_id'], r['tag_id']])

  if (!DRY_RUN) {
    await batchInsert(
      pool,
      'bookmark_tags',
      ['bookmark_id', 'tag_id'],
      insertRows,
    )
  }
  return insertRows.length
}

async function resetSequences(pool: Pool): Promise<void> {
  if (DRY_RUN) return

  const sequences = [
    { col: 'id', seq: '"Feeds_id_seq"', table: 'feeds' },
    { col: 'id', seq: 'media_id_seq', table: 'media' },
  ]

  for (const { seq, table, col } of sequences) {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(${col}), 0) AS max_id FROM ${table}`,
    )
    const maxId = rows[0]?.max_id ?? 0
    await pool.query(`SELECT setval('${seq}', $1, true)`, [maxId])
    console.log(`  Sequence ${seq} reset to ${maxId}`)
  }
}

type CountMap = Record<string, number>

async function getTargetCounts(pool: Pool): Promise<CountMap> {
  const tables = [
    '"user"',
    'account',
    'profiles',
    'bookmarks',
    'tags',
    'bookmark_tags',
    'feeds',
    'media',
    'toots',
    'tweets',
    'user_integrations',
  ]
  const counts: CountMap = {}
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM ${t}`)
    counts[t] = Number(rows[0]?.c ?? 0)
  }
  return counts
}

async function validateForeignKeys(pool: Pool): Promise<string[]> {
  const warnings: string[] = []

  const checks: Array<{ label: string; sql: string }> = [
    {
      label: 'bookmarks.user refs user',
      sql: `SELECT COUNT(*) AS c FROM bookmarks b WHERE b."user" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = b."user")`,
    },
    {
      label: 'profiles.id refs user',
      sql: `SELECT COUNT(*) AS c FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = p.id)`,
    },
    {
      label: 'bookmark_tags bookmark_id refs bookmarks',
      sql: `SELECT COUNT(*) AS c FROM bookmark_tags bt WHERE NOT EXISTS (SELECT 1 FROM bookmarks b WHERE b.id = bt.bookmark_id)`,
    },
    {
      label: 'bookmark_tags tag_id refs tags',
      sql: `SELECT COUNT(*) AS c FROM bookmark_tags bt WHERE NOT EXISTS (SELECT 1 FROM tags t WHERE t.id = bt.tag_id)`,
    },
    {
      label: 'toots.db_user_id refs user',
      sql: `SELECT COUNT(*) AS c FROM toots t WHERE t.db_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = t.db_user_id)`,
    },
    {
      label: 'tweets.db_user_id refs user',
      sql: `SELECT COUNT(*) AS c FROM tweets t WHERE t.db_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = t.db_user_id)`,
    },
  ]

  for (const { label, sql } of checks) {
    const { rows } = await pool.query(sql)
    const orphans = Number(rows[0]?.c ?? 0)
    if (orphans > 0) {
      warnings.push(`FK violation: ${label} — ${orphans} orphaned rows`)
    }
  }

  return warnings
}

async function resetTargetTables(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      bookmark_tags,
      user_integrations,
      toots,
      tweets,
      media,
      bookmarks,
      profiles,
      feeds,
      tags,
      account,
      session,
      verification,
      "user"
    CASCADE
  `)
  console.log('  Target tables truncated')
}

interface Report {
  startedAt: string
  finishedAt: string
  dryRun: boolean
  reset: boolean
  copyPasswords: boolean
  dumpPath: string
  sourceCounts: CountMap
  targetCounts: CountMap
  warnings: string[]
}

async function main() {
  console.log(`\nOtter — legacy import script`)
  console.log(`  dump: ${DUMP_PATH}`)
  console.log(`  dry-run: ${DRY_RUN}`)
  console.log(`  reset: ${RESET}`)
  console.log(`  copy-passwords: ${COPY_PASSWORDS}`)
  console.log()

  const startedAt = new Date().toISOString()
  const pool = new Pool({ connectionString: DATABASE_URL })

  let dump: string
  try {
    dump = readFileSync(DUMP_PATH, 'utf-8')
  } catch (err) {
    console.error(`Cannot read dump file: ${DUMP_PATH}`)
    console.error(err)
    process.exit(1)
  }

  const sourceTables: Array<[string, string, string]> = [
    ['auth', 'users', '"user"'],
    ['public', 'profiles', 'profiles'],
    ['public', 'bookmarks', 'bookmarks'],
    ['public', 'tags', 'tags'],
    ['public', 'bookmark_tags', 'bookmark_tags'],
    ['public', 'feeds', 'feeds'],
    ['public', 'media', 'media'],
    ['public', 'toots', 'toots'],
    ['public', 'tweets', 'tweets'],
    ['public', 'user_integrations', 'user_integrations'],
  ]
  const sourceCounts: CountMap = {}
  for (const [schema, table, label] of sourceTables) {
    const { rows } = parseCopyBlock(dump, schema, table)
    sourceCounts[label] = rows.length
  }

  console.log('Source row counts:')
  for (const [label, count] of Object.entries(sourceCounts)) {
    console.log(`  ${label}: ${count}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('Dry run — no DB writes')
    const report: Partial<Report> = {
      dryRun: true,
      finishedAt: new Date().toISOString(),
      sourceCounts,
      startedAt,
    }
    console.log('\nDone (dry run)')
    console.log(JSON.stringify(report, null, 2))
    await pool.end()
    return
  }

  if (RESET) {
    console.log('Resetting target tables...')
    await resetTargetTables(pool)
    console.log()
  }

  console.log('Importing...')

  const { count: userCount } = await importUsers(pool, dump)
  console.log(`  user: ${userCount}`)

  const profileCount = await importProfiles(pool, dump)
  console.log(`  profiles: ${profileCount}`)

  const tagCount = await importTags(pool, dump)
  console.log(`  tags: ${tagCount}`)

  const feedCount = await importFeeds(pool, dump)
  console.log(`  feeds: ${feedCount}`)

  const bookmarkCount = await importBookmarks(pool, dump)
  console.log(`  bookmarks: ${bookmarkCount}`)

  const mediaCount = await importMedia(pool, dump)
  console.log(`  media: ${mediaCount}`)

  const tootCount = await importToots(pool, dump)
  console.log(`  toots: ${tootCount}`)

  const tweetCount = await importTweets(pool, dump)
  console.log(`  tweets: ${tweetCount}`)

  const integrationCount = await importUserIntegrations(pool, dump)
  console.log(`  user_integrations: ${integrationCount}`)

  const bookmarkTagCount = await importBookmarkTags(pool, dump)
  console.log(`  bookmark_tags: ${bookmarkTagCount}`)

  console.log('\nResetting sequences...')
  await resetSequences(pool)

  console.log('\nValidating...')
  const fkWarnings = await validateForeignKeys(pool)
  if (fkWarnings.length > 0) {
    for (const w of fkWarnings) {
      console.warn(`  [warn] ${w}`)
    }
  } else {
    console.log('  Foreign key checks passed')
  }

  const targetCounts = await getTargetCounts(pool)
  console.log('\nTarget row counts:')
  for (const [label, count] of Object.entries(targetCounts)) {
    console.log(`  ${label}: ${count}`)
  }

  const warnings: string[] = [...fkWarnings]
  for (const [label, sourceCount] of Object.entries(sourceCounts)) {
    const targetCount = targetCounts[label] ?? 0
    if (targetCount < sourceCount) {
      warnings.push(
        `Count mismatch: ${label} source=${sourceCount} target=${targetCount} (${sourceCount - targetCount} missing)`,
      )
    }
  }

  if (!COPY_PASSWORDS) {
    warnings.push(
      'Accounts created without passwords. Users must reset their password before signing in.',
    )
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:')
    for (const w of warnings) {
      console.warn(`  [warn] ${w}`)
    }
  }

  const finishedAt = new Date().toISOString()
  const report: Report = {
    copyPasswords: COPY_PASSWORDS,
    dryRun: DRY_RUN,
    dumpPath: DUMP_PATH,
    finishedAt,
    reset: RESET,
    sourceCounts,
    startedAt,
    targetCounts,
    warnings,
  }

  const reportPath = resolve(
    process.cwd(),
    `migration-report-${Date.now()}.json`,
  )
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written to: ${reportPath}`)
  console.log(
    `\nDone in ${Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)}s`,
  )

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
