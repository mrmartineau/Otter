# Neon Migration Notes

Otter now runs on:

- Cloudflare Workers
- Neon Postgres
- Better Auth
- Drizzle ORM
- Otter-owned Hono API routes

## Current architecture

- Neon is the system of record for application data.
- Better Auth owns users, sessions, passwords, and OAuth.
- Drizzle owns schema and migrations.
- Browser clients and external clients talk to Otter API routes, not directly to the database.
- `profiles.api_key` remains the compatibility token for automation and extensions.

## Operational notes

- Use Neon branches for staging and migration rehearsals.
- Use Neon pooled connection strings for app/runtime access unless a direct connection is explicitly required.
- Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `RAYCAST_OAUTH_CLIENT_ID` in environment-specific secret stores.
- If Hyperdrive is used, document it as an optional connection layer in front of Neon rather than as a self-hosted database requirement.

## Cleanup status

Completed:

- Legacy auth/data runtime access has been removed from the app.
- Better Auth browser login is in place.
- Drizzle/Postgres is in place.
- Raycast OAuth now targets Otter-owned OAuth endpoints.

Remaining cleanup to verify:

- Remove stale legacy migration references from docs and examples.
- Keep any legacy SQL export/import tooling clearly marked as archival or one-off migration support.
- Verify no extension or package still depends on legacy SDKs.

## Environment checklist

Required app env vars:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `VITE_ALLOW_SIGNUP`
- `BETTER_AUTH_DISABLE_SIGNUP`

Optional env vars:

- `RAYCAST_OAUTH_CLIENT_ID`
- `BOT_MASTODON_ACCESS_TOKEN`
- `PERSONAL_MASTODON_ACCESS_TOKEN`
- `WEBHOOK_SECRET`

## Deployment checklist

- Neon production database created
- Neon staging branch/database created
- Drizzle migrations run cleanly
- Better Auth works on staging and production domains
- OAuth client registration run for Raycast where needed
- Backup/restore process documented for Neon
- Worker secrets set per environment
