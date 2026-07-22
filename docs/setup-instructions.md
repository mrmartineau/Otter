# Otter Setup Instructions

This guide covers the current Otter stack: Cloudflare Workers, Neon Postgres, Better Auth, and Drizzle ORM.

## Prerequisites

- Node.js 20+
- pnpm
- A Neon account
- A Cloudflare account
- Wrangler CLI

## 1. Clone and install

```bash
git clone https://github.com/mrmartineau/otter.git
cd otter
pnpm install
```

## 2. Create a Neon database

1. Create a Neon project.
2. Create a database for Otter.
3. Copy a pooled Postgres connection string.
4. Optionally create a separate branch or database for staging.

## 3. Configure local environment

Create `packages/web/.dev.vars` for local development:

```bash
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
BETTER_AUTH_SECRET=replace-me
BETTER_AUTH_URL=http://localhost:5678
RAYCAST_OAUTH_CLIENT_ID=
VITE_ALLOW_SIGNUP=false
BETTER_AUTH_DISABLE_SIGNUP=true
BOT_MASTODON_ACCESS_TOKEN=
PERSONAL_MASTODON_ACCESS_TOKEN=
WEBHOOK_SECRET=
```

Notes:

- `DATABASE_URL` should point at Neon.
- `BETTER_AUTH_URL` must match the actual app origin for the environment.
- Signups are disabled by default.

## 4. Run database migrations

```bash
cd packages/web
pnpm db:migrate
```

## 5. Start the app locally

```bash
cd packages/web
pnpm dev
```

Open <http://localhost:5678>.

## 6. Deploy to Cloudflare Workers

Set production secrets with Wrangler:

```bash
cd packages/web
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_URL
wrangler secret put RAYCAST_OAUTH_CLIENT_ID
wrangler secret put BOT_MASTODON_ACCESS_TOKEN
wrangler secret put PERSONAL_MASTODON_ACCESS_TOKEN
wrangler secret put WEBHOOK_SECRET
```

Then deploy:

```bash
pnpm deploy
```

## 7. Optional Raycast OAuth setup

Register the first-party OAuth client after migrations:

```bash
cd packages/web
RAYCAST_OAUTH_CLIENT_ID="$(uuidgen)" pnpm oauth:raycast
```

Use that same client id in the Raycast extension settings.

## 8. Notes

- Otter now uses Better Auth and Otter API routes for auth and data access.
- Browser clients should never use direct database credentials.
- If you add Hyperdrive, treat it as optional infrastructure in front of Neon, not as the source of truth.
