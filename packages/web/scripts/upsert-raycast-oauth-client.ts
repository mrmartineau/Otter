/**
 * Register or update the first-party Raycast OAuth client.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm exec tsx scripts/upsert-raycast-oauth-client.ts --client-id <uuid>
 */

import { Pool } from 'pg'

const args = process.argv.slice(2)
const get = (flag: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const clientId = get('--client-id') ?? process.env.RAYCAST_OAUTH_CLIENT_ID
const redirectUris = Array.from(
  new Set(
    (
      get('--redirect-uri') ??
      process.env.RAYCAST_OAUTH_REDIRECT_URI ??
      [
        'https://raycast.com/redirect?packageName=Extension',
        'https://raycast.com/redirect/extension',
      ].join(',')
    )
      .split(',')
      .map((uri) => uri.trim())
      .filter(Boolean),
  ),
)
const databaseUrl = process.env.DATABASE_URL

if (!clientId) {
  console.error('Usage: --client-id <client-id>')
  process.exit(1)
}

if (!databaseUrl) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

await pool.query(
  `
    INSERT INTO oauth_client (
      client_id,
      client_secret,
      disabled,
      grant_types,
      name,
      public,
      redirect_uris,
      require_pkce,
      response_types,
      scopes,
      skip_consent,
      token_endpoint_auth_method,
      type,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      NULL,
      false,
      ARRAY['authorization_code', 'refresh_token']::text[],
      'Otter Raycast Extension',
      true,
      $2::text[],
      true,
      ARRAY['code']::text[],
      ARRAY[
        'openid',
        'email',
        'offline_access',
        'bookmarks:read',
        'bookmarks:write',
        'profile:read'
      ]::text[],
      true,
      'none',
      'native',
      now(),
      now()
    )
    ON CONFLICT (client_id)
    DO UPDATE SET
      disabled = false,
      grant_types = EXCLUDED.grant_types,
      name = EXCLUDED.name,
      public = EXCLUDED.public,
      redirect_uris = EXCLUDED.redirect_uris,
      require_pkce = EXCLUDED.require_pkce,
      response_types = EXCLUDED.response_types,
      scopes = EXCLUDED.scopes,
      skip_consent = EXCLUDED.skip_consent,
      token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
      type = EXCLUDED.type,
      updated_at = now()
  `,
  [clientId, redirectUris],
)

console.log(`Raycast OAuth client is ready: ${clientId}`)
console.log(`Redirect URIs: ${redirectUris.join(', ')}`)

await pool.end()
