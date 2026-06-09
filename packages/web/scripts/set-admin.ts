/**
 * Grant or revoke the `admin` role for a user, by email.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm exec tsx scripts/set-admin.ts --email you@example.com
 *   DATABASE_URL=postgres://... pnpm exec tsx scripts/set-admin.ts --email you@example.com --revoke
 */

import { Pool } from 'pg'

const args = process.argv.slice(2)
const get = (flag: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const email = get('--email')
const revoke = args.includes('--revoke')
const databaseUrl = process.env.DATABASE_URL

if (!email) {
  console.error('Usage: --email <email> [--revoke]')
  process.exit(1)
}

if (!databaseUrl) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })
const role = revoke ? 'user' : 'admin'

const result = await pool.query(
  `
    UPDATE profiles
    SET role = $1, updated_at = now()
    WHERE id = (SELECT id FROM "user" WHERE email = $2)
    RETURNING id
  `,
  [role, email],
)

if (result.rowCount === 0) {
  console.error(`No user found with email: ${email}`)
  await pool.end()
  process.exit(1)
}

console.log(`Set role="${role}" for ${email}`)
await pool.end()
