# Otter Web

## Setup

### 1. Create a Neon database

Create a fresh Postgres database in Neon.

- Use the **direct** connection string for setup and migrations.
- Prefer `sslmode=verify-full` in the connection string.

### 2. Install dependencies

From the repo root:

```bash
pnpm install
cd packages/web
```

### 3. Create local env vars

Create `packages/web/.dev.vars`:

```bash
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=verify-full
BETTER_AUTH_SECRET=replace-with-a-random-secret
BETTER_AUTH_URL=http://localhost:5678
RAYCAST_OAUTH_CLIENT_ID=
VITE_ALLOW_SIGNUP=false
BETTER_AUTH_DISABLE_SIGNUP=true
BOT_MASTODON_ACCESS_TOKEN=
PERSONAL_MASTODON_ACCESS_TOKEN=
WEBHOOK_SECRET=replace-with-a-random-secret
```

Generate secrets with:

```bash
openssl rand -hex 32
```

### 4. Run the baseline migration

From `packages/web/`:

```bash
pnpm db:migrate
```

This project uses a **single baseline migration** at `drizzle/0000_initial_schema.sql` so new users can inspect the full schema in one file.

### 5. Enable signups for local testing

Update `packages/web/.dev.vars`:

```bash
VITE_ALLOW_SIGNUP=true
BETTER_AUTH_DISABLE_SIGNUP=false
```

### 6. Start the app

```bash
pnpm dev
```

Then visit [`http://localhost:5678`](http://localhost:5678).

### 7. Optional: import legacy data

If you are migrating an existing Otter dataset:

```bash
pnpm db:import -- --dry-run
pnpm db:import -- --reset --copy-passwords
```

This imports the legacy SQL dump into the new schema.

## Scripts

```bash
pnpm dev              # Start dev server on port 5678
pnpm build            # TypeScript check and Vite build
pnpm preview          # Build and preview with Vite
pnpm deploy           # Build and deploy to Cloudflare Workers
pnpm cf-typegen       # Generate Cloudflare Workers types
pnpm db:generate      # Generate Drizzle migrations from schema changes
pnpm db:migrate       # Run Drizzle migrations
pnpm db:import        # Import legacy SQL dump data
pnpm db:import:legacy # Import legacy SQL dump data explicitly
pnpm db:studio        # Open Drizzle Studio
pnpm oauth:raycast    # Register/update the first-party Raycast OAuth client
pnpm type-check       # Run TypeScript type checking
```

## Env vars

Create a `.dev.vars` file in `packages/web/` for local development.

```bash
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=verify-full
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:5678
RAYCAST_OAUTH_CLIENT_ID=
VITE_ALLOW_SIGNUP=false
BETTER_AUTH_DISABLE_SIGNUP=true
BOT_MASTODON_ACCESS_TOKEN=
PERSONAL_MASTODON_ACCESS_TOKEN=
WEBHOOK_SECRET=
```

Runtime notes:

- `DATABASE_URL` should point at Neon.
- For local setup and migrations, use Neon’s **direct** connection string rather than the pooled one.
- `BETTER_AUTH_URL` must match the real app origin exactly.
- `pnpm dev` reads `.dev.vars`; a plain `.env` file is not enough for Worker runtime env vars.
- If Hyperdrive is used, treat it as optional infrastructure in front of Neon.

## Troubleshooting

### `pnpm db:migrate` fails with an unhelpful error

Try the migration SQL directly with `psql` to get the real Postgres error:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0000_initial_schema.sql
```

### Neon connection issues

- Use Neon’s **direct** connection string for setup, migrations, and imports.
- Prefer `sslmode=verify-full`.
- The pooled `-pooler` connection string may work for app traffic, but it is not ideal for debugging or schema setup.

### `gen_random_uuid()` / `pgcrypto` errors

The baseline migration creates `pgcrypto` automatically. If you are working against a partially-created or manually modified database, confirm:

```bash
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
```

### `500` on `/api/auth/get-session`

Common causes:

- missing or incorrect `packages/web/.dev.vars`
- `BETTER_AUTH_URL` does not exactly match `http://localhost:5678`
- database schema is missing Better Auth tables
- browser has stale cookies from an older local setup

Things to try:

```bash
rm -rf .wrangler/state 2>/dev/null || true
```

Then restart `pnpm dev`, clear site cookies for `localhost`, and try again.

### Better Auth `jwks` errors

If you see an error like:

```text
The model "jwks" was not found in the schema object
```

make sure you are using the latest schema and the latest baseline migration. The `jwks` table is now included in `drizzle/0000_initial_schema.sql`.

### Imported users can sign in but session fetch fails

Check that:

- the `session` table exists
- auth cookies are being set by `/api/auth/sign-in/email`
- `BETTER_AUTH_URL` matches the browser origin exactly

To inspect session rows:

```bash
psql "$DATABASE_URL" -c 'select id, token, user_id, expires_at, created_at from "session" order by created_at desc limit 10;'
```

## Raycast OAuth setup

The Raycast extension authenticates with Otter through Better Auth OAuth.

```bash
RAYCAST_OAUTH_CLIENT_ID="$(uuidgen)"
DATABASE_URL=postgresql://... \
RAYCAST_OAUTH_CLIENT_ID="$RAYCAST_OAUTH_CLIENT_ID" \
pnpm oauth:raycast
```

Use the same `RAYCAST_OAUTH_CLIENT_ID` in Raycast.

## Migrating from Supabase

If you're moving an existing Otter instance off Supabase, use the legacy import script after exporting a SQL dump from Supabase.

Default dump location expected by the script:

```bash
packages/web/legacy-export/data.sql
```

You can also pass a custom dump path with `--dump`.

Run the migration from `packages/web`:

```bash
pnpm db:migrate
pnpm db:import -- --dry-run --dump ./legacy-export/data.sql
pnpm db:import -- --reset --dump ./legacy-export/data.sql
```

To also copy legacy bcrypt password hashes into Better Auth accounts:

```bash
pnpm db:import -- --reset --copy-passwords --dump ./legacy-export/data.sql
```

The import command runs:

```bash
scripts/import-legacy-data.ts
```

The dump should include data for:

- `auth.users`
- `profiles`
- `bookmarks`
- `tags`
- `bookmark_tags`
- `feeds`
- `media`
- `toots`
- `tweets`
- `user_integrations`

## Tech Stack

- **Frontend**: React 19, TanStack Router, React Query, Tailwind CSS v4
- **Backend**: Hono API on Cloudflare Workers
- **Database**: Neon Postgres with Drizzle ORM
- **Auth**: Better Auth
- **AI**: Cloudflare Workers AI
- **Build**: Vite

## API Endpoints

- `GET /api/` - health check
- `POST /api/new` - create new item in Otter
- `GET /api/new?url=https://example.com` - quick create bookmark from URL with metadata
- `GET /api/bookmarks` - returns bookmarks
- `GET /api/search?q=example` - search bookmarks
- `GET /api/media` - returns media items grouped by type and status
- `GET /api/media-search` - search media items
- `POST /api/toot` - internal bookmark side-effect endpoint for Mastodon
- `GET /api/scrape?url=https://example.com` - scrape a URL
- `POST /api/ai/title` - rewrite a title with AI
- `POST /api/ai/description` - rewrite a description with AI
- `GET /api/rss?feed=https://example.com/rss` - convert an RSS feed to JSON

## Mastodon integration

Otter can auto-post to Mastodon when a bookmark becomes public. This is handled by Worker-side side effects authenticated with `WEBHOOK_SECRET`.

## Better Auth well-known endpoint checks

Verify OAuth/OpenID discovery endpoints locally:

```bash
curl -i http://localhost:5678/.well-known/oauth-authorization-server/api/auth
curl -i http://localhost:5678/.well-known/openid-configuration/api/auth
curl -i http://localhost:5678/api/auth/get-session
```

For a formatted response, if you have `jq` installed:

```bash
curl -s http://localhost:5678/.well-known/oauth-authorization-server/api/auth | jq
curl -s http://localhost:5678/.well-known/openid-configuration/api/auth | jq
```

In production, replace `http://localhost:5678` with your real Otter base URL.

## API key smoke checks

Use `profiles.api_key` as a bearer token for automation endpoints:

```bash
curl -H "Authorization: Bearer $OTTER_USER_API_KEY" \
  "http://localhost:5678/api/bookmarks?limit=5"

curl -H "Authorization: Bearer $OTTER_USER_API_KEY" \
  "http://localhost:5678/api/search?q=example"

curl -X POST "http://localhost:5678/api/new" \
  -H "Authorization: Bearer $OTTER_USER_API_KEY" \
  -H "Content-Type: application/json" \
  --data '[{"url":"https://example.com","title":"Example"}]'
```
