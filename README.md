<div align="center">

  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/Otter/main/public/otter-logo.svg"
        width="90"
        height="90"
      /><br/>Otter</h1>

> Otter is a self-hosted bookmark manager made with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com) with Mastodon integration.

  <p>
    <a
      href="https://github.com/MrMartineau/Otter/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="Otter is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://main.elk.zone/toot.cafe/@zander">
      <img src="https://img.shields.io/mastodon/follow/90758?domain=https%3A%2F%2Ftoot.cafe" alt="Follow @zander" />
    </a>
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting started</a> •
    <a href="#docs">Docs</a> •
    <a href="#otter-ecosystem">Ecosystem</a>
  </p>
</div>

## Features

- Private bookmarking app with search, tagging and filtering
- Dark/light colour modes
- Mastodon integration - backup of your own toots as well as your favourite toots
- Raycast extension to search your bookmarks, view recent bookmarks and create new ones
- Chrome extension for easy bookmarking
- Bookmarklet

### Screenshots

| Feed (dark mode) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/feed.png?raw=true" width="400" />                    | Feed (light mode) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/feed-light.png?raw=true" width="400" /> |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| New bookmark <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/add-new.png?raw=true" width="400" />                     | Search <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/search.png?raw=true" width="400" />                |
| Feed (showing tags sidebar) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/tags-sidebar.png?raw=true" width="400" /> | Toots feed <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/toots.png?raw=true" width="400" />             |

## Getting started

### Prerequisites

- [pnpm](https://pnpm.io) - install with `npm i -g pnpm`
- [Vercel](https://vercel.com) account and the [Vercel CLI](https://vercel.com/cli) - install with `npm i -g vercel`
- [Supabase](https://supabase.com) account and the [Supabase CLI](https://supabase.com/docs/reference/cli/introduction) - install with `npm i -g supabase`
- [Cloudflare](https://cloudflare.com) account (optional) - used for the page scraper and Mastodon to Supabase worker

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
# Find these in your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key # only needed for testing APIs using the `*.rest` files

PERSONAL_MASTODON_ACCESS_TOKEN=your-personal-app-mastodon-access-token
BOT_MASTODON_ACCESS_TOKEN=your-bot-app-mastodon-access-token
OTTER_API_TOKEN=your-otter-api-token
```

### Docs

### API Endpoints

Interactive API docs can be found in the various `*.rest` files in the `/app/api` directory.

- `POST /api/new` - create new item in Otter
- `GET /api/new?url=https://example.com` - quick create new item in Otter. Pass in a `url` query param and it will create a new item with that URL and includes its metadata too
- `GET /api/bookmarks` - returns all bookmarks
<!-- - `GET /api/bookmarks/:id` - returns a single bookmark -->
- `GET /api/search?searchTerm=zander` - search bookmark
- `POST /api/toot` - A PostgreSQL trigger function calls this endpoint anytime a bookmark is created or edited which then creates a new toot on two of my Mastodon accounts ([@otterbot@botsin.space](https://botsin.space/@otterbot) & [@zander@toot.cafe](https://toot.cafe/@zander)). It only sends a toot if the bookmark has the `public` column set to `true`.

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

## Otter ecosystem

I use various other tools to make Otter even better:

- [Raycast extension](https://github.com/mrmartineau/raycast-extensions/tree/main/otter) (not currently on the Raycast extension marketplace)
- [Chrome extension](https://github.com/mrmartineau/otter-extension) (not currently on the Chrome webstore)
- [Apple Shortcut](https://github.com/mrmartineau/Otter/blob/main/public/Add%20to%20Otter.shortcut) - download this shortcut and update your Otter instance URL within it. Then you can add it to your iOS share sheet and quickly add new bookmarks to Otter
- [Page scraper Cloudflare worker](https://github.com/mrmartineau/cloudflare-worker-scraper) used to scrape the metadata of a URL. This is used when adding new bookmarks to Otter
- [Mastodon to Supabase Cloudflare worker](https://github.com/mrmartineau/mastodon-to-supabase) used to backup my Mastodon toots to Supabase

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
