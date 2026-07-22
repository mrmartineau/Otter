<div align="center">

  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/Otter/refs/heads/main/packages/web/public/otter-logo.svg"
        width="90"
        height="90"
      /><br/>Otter</h1>

> Otter is a self-hosted bookmark manager and media tracker built with React, [Supabase](https://supabase.com), and [Cloudflare Workers](https://workers.cloudflare.com)

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
    <a href="#packages">Packages</a> •
    <a href="#getting-started">Getting started</a> •
    <a href="#tech-stack">Tech stack</a>
  </p>
</div>

## Features

- Private bookmarking app with search, tagging, collections, and filtering
- Starred items and public/private visibility per bookmark
- Dark/light colour modes
- **Media tracking** — kanban-style board for tracking movies, TV shows, games, and more
- **AI-powered** title and description rewriting via Cloudflare Workers AI
- RSS feed parsing and URL scraping
- Mastodon integration — backup your own toots and favourite toots
- Cross-browser web extension (Chrome & Firefox)
- Raycast extension to search, view, and create bookmarks
- Native macOS/iOS app
- Bookmarklet

### Screenshots

| Feed (dark mode) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/feed.png?raw=true" width="400" />                    | Feed (light mode) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/feed-light.png?raw=true" width="400" /> |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| New bookmark <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/add-new.png?raw=true" width="400" />                     | Search <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/search.png?raw=true" width="400" />                |
| Feed (showing tags sidebar) <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/tags-sidebar.png?raw=true" width="400" /> | Toots feed <br/> <img src="https://raw.githubusercontent.com/mrmartineau/Otter/main/screens/toots.png?raw=true" width="400" />             |

## Packages

This is a pnpm monorepo containing the following packages:

| Package | Description |
| --- | --- |
| [`packages/web`](packages/web) | Web app and Hono API on Cloudflare Workers |
| [`packages/app`](packages/app) | Native macOS/iOS app |
| [`packages/web-extension`](packages/web-extension) | Cross-browser extension (Chrome & Firefox) |
| [`packages/raycast-extension`](packages/raycast-extension) | [Raycast](https://www.raycast.com/mrmartineau/otter) extension |
| [`packages/chrome-extension`](packages/chrome-extension) | Legacy Chrome extension (superseded by `web-extension`) |

## Getting started

### Prerequisites

- [pnpm](https://pnpm.io) v10+ — install with `corepack enable && corepack prepare pnpm@latest --activate`
- [Supabase](https://supabase.com) account and the [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [Cloudflare](https://cloudflare.com) account — used for hosting, Workers AI, and the API

For a full walkthrough — including Supabase database setup, Cloudflare configuration, and deployment — see the **[Setup Instructions](docs/setup-instructions.md)**.

### Quick start

```sh
pnpm install
pnpm web:dev
```

## Releasing

Otter uses [semantic-release](https://github.com/semantic-release/semantic-release) with the [`semantic-release-monorepo`](https://github.com/pmowrer/semantic-release-monorepo) plugin to version each package independently based on [Conventional Commits](https://www.conventionalcommits.org/). Packages are not published to npm — releases are GitHub releases only.

### Commit message format

| Prefix | Release type |
| :----- | :----------- |
| `fix:` | Patch (`1.0.x`) |
| `feat:` | Minor (`1.x.0`) |
| `feat!:` or `BREAKING CHANGE:` | Major (`x.0.0`) |

### Per-package versioning

Each releasable package has its own `release.config.mjs` that extends `semantic-release-monorepo`. The plugin filters commits to those that touch files inside the package's directory, so a commit changing only `packages/web` will only bump and release `@mrmartineau/otter-web`.

Releasable packages:

- `@mrmartineau/otter-web` — tags as `@mrmartineau/otter-web@vX.Y.Z`
- `@mrmartineau/otter-chrome-extension` — tags as `@mrmartineau/otter-chrome-extension@vX.Y.Z`
- `@mrmartineau/otter-web-extension` — tags as `@mrmartineau/otter-web-extension@vX.Y.Z`

The `app` and `raycast-extension` packages are released through their own platforms (App Store / Raycast Store) and are not part of this workflow.

### CI / automated releases

Releases are triggered manually via the **"Release"** workflow in GitHub Actions (`.github/workflows/release.yml`). The workflow:

1. Installs dependencies
2. Runs `semantic-release` inside each releasable package via `pnpm --filter ... exec semantic-release`
3. For each package with relevant new commits: bumps `package.json`, updates that package's `CHANGELOG.md`, commits the bump back to `main`, and creates a GitHub release with package-scoped tag and notes

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no additional secrets required.

### Scoping commits

To target a specific package, use a Conventional Commits scope, e.g. `feat(web): ...` or `fix(chrome-extension): ...`. The plugin uses changed file paths (not the scope) to decide which package releases, but scopes make the changelog clearer.

## Tech stack

- **Frontend:** React 19, TanStack Router, React Query, Tailwind CSS v4
- **API:** [Hono](https://hono.dev) on Cloudflare Workers with AI bindings
- **Database:** [Supabase](https://supabase.com) (Postgres)
- **Hosting:** [Cloudflare](https://cloudflare.com)
- **Tooling:** pnpm workspaces, [Biome](https://biomejs.dev) (formatting & linting), Vite

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
