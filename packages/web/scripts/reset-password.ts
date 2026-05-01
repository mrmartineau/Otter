/**
 * Set a new password for a Better Auth credential account directly in the DB.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/reset-password.ts --email you@example.com --password "newpassword"
 */

import { hash } from 'bcryptjs'
import { Pool } from 'pg'

const args = process.argv.slice(2)
const get = (flag: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const email = get('--email')
const password = get('--password')
const DATABASE_URL = process.env.DATABASE_URL

if (!email || !password) {
  console.error('Usage: --email <email> --password <password>')
  process.exit(1)
}
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

const hashed = await hash(password, 10)

const result = await pool.query(
  `UPDATE account SET password = $1 WHERE account_id = $2 AND provider_id = 'credential'`,
  [hashed, email],
)

if (result.rowCount === 0) {
  console.error(`No credential account found for ${email}`)
  process.exit(1)
}

console.log(`Password updated for ${email}`)
await pool.end()
