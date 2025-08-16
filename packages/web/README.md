# Otter Web

### Setup

1. Fork this repo
2. Go to [database.new](https://database.new) and create a new [Supabase](https://supabase.com) project. You will need the project ID (found in the project settings page) and the the database password for the next step.
3. Link your Supabase project to your local dev environment: `pnpm supabase:link`
4. Seed your database with `pnpm supabase:setup`
5. Install npm dependencies with [pnpm](https://pnpm.io): `pnpm install`
6. Create a new project on vercel and setup env vars (see below)
7. To allow signups, set the value of `ALLOW_SIGNUP` in `./src/constants.ts` to `true`
8. Run the app locally using `pnpm dev`
9. Visit [`http://localhost:5678`](http://localhost:5678) and create an account

### Env vars

Set up the following env vars using either the Vercel CLI or through the Vercel project settings. Once they are added run `vc env pull` to pull them down to your local dev environment.

```bash
# Update these with your Supabase details from your project settings > API
# https://app.supabase.com/project/_/settings/api

# frontend
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# backend
SUPABASE_SERVICE_KEY=your-service-key # used for API access in conjunction with user's API key

# the following two are only required for the Mastodon integration
BOT_MASTODON_ACCESS_TOKEN=
PERSONAL_MASTODON_ACCESS_TOKEN=
```

### Docs

### API Endpoints

The API uses a [hono](https://hono.dev/) server hosted on Cloudflare Workers.

Interactive API docs can be found in the various `*.rest` files in the `/worker` directory.

- `POST /api/new` - create new item in Otter
- `GET /api/new?url=https://example.com` - quick create new item in Otter. Pass in a `url` query param and it will create a new item with that URL and includes its metadata too
- `GET /api/bookmarks` - returns all bookmarks
<!-- - `GET /api/bookmarks/:id` - returns a single bookmark -->
- `GET /api/search?searchTerm=zander` - search bookmark
- `POST /api/toot` - A PostgreSQL trigger function calls this endpoint anytime a bookmark is created or edited which then creates a new toot on two of my Mastodon accounts ([@otterbot@botsin.space](https://botsin.space/@otterbot) & [@zander@toot.cafe](https://toot.cafe/@zander)). It only sends a toot if the bookmark has the `public` column set to `true`.
- `GET /api/scrape?url=https://example.com` - scrape a url using Cloudflare's `HTMLRewriter`
- `POST /api/ai/title` - rewrite a page's title with AI. Uses Cloudflare's AI bindings.
- `POST /api/ai/description` - rewrite a page's description with AI
- `GET /api/rss?feed=https://letterboxd.com/mrmartineau/rss/` - convert a RSS feed to JSON

### Mastodon integration

Otter has the ability to auto-toot to 2 Mastodon accounts when a new bookmark is created or edited. This is done via a PostgreSQL trigger function that calls the `/api/toot` endpoint.
The trigger function below uses an environment variable in the `Authorization` header to ensure only the owner of the Otter instance can call the endpoint.

```sql
create trigger "toot-otter-items"
after insert
or
update on bookmarks for each row
execute function supabase_functions.http_request (
  'https://{your-otter-instance}/api/toot',
  'POST',
  -- replace {OTTER_API_TOKEN} with your own token
  '{"Content-type":"application/json","Authorization":"{OTTER_API_TOKEN}"}',
  '{}',
  '1000'
);
```

TODO:

- [ ] document the PostgreSQL trigger function that calls the `/api/toot` endpoint

### Bookmarks

#### Adding new bookmark types

1. Add the new type to the types enum `ALTER TYPE type ADD VALUE '???';`
2. Run `pnpm run supabase:types` to update the TypeScript types
3. Add a new `case` to the `TypeToIcon` component
4. Add a new `TypeRadio` component to the `BookmarkForm` component
