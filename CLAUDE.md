# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Otter is a self-hosted bookmark manager and media tracker. This is a **pnpm monorepo** (`packages/*`). The core product is `packages/web` — a React SPA + Hono API running together in one Cloudflare Worker, backed by Postgres (Drizzle ORM via Hyperdrive) and `better-auth`. The other packages are clients that consume that Worker's API. There is a deeper `CLAUDE.md` inside `packages/web/` — read it before working there.

## Packages

| Package | What it is | Stack |
| --- | --- | --- |
| `packages/web` | Main app: bookmark/media UI + REST API + OAuth/MCP provider. Deployed to Cloudflare. | React 19, TanStack Router/Query, Hono, Drizzle, Cloudflare Workers, Tailwind v4 |
| `packages/web-extension` | Cross-browser extension (Chrome + Firefox) — save bookmarks from the browser | Webpack, `TARGET=chrome\|firefox` builds |
| `packages/raycast-extension` | Raycast commands (search / recent / add / menubar) — auths via the web OAuth provider | Raycast API |
| `packages/app` | Native macOS/iOS app (Safari web-extension + share sheet) | Xcode / Swift |
| `packages/chrome-extension` | Legacy Chrome extension, superseded by `web-extension` | Webpack |

## Commands

```sh
pnpm install               # bootstrap the workspace

# Root scripts (package.json):
pnpm check                 # biome check --write — lint + format across the repo
pnpm web:dev               # run packages/web dev server
pnpm web:build             # build packages/web
pnpm chrome-extension:build

# Per-package work: cd into the package, or use pnpm --filter:
pnpm --filter=@mrmartineau/otter-web-extension run build:firefox
```

Most day-to-day work happens in `packages/web` — see `packages/web/CLAUDE.md` for its dev/build/test/db commands and architecture. Notably: type-check with `tsc -b` (not the `type-check` script), and tests run via `pnpm vitest run` (no test script defined).

**Package manager:** pnpm (v11, `packageManager` pinned). corepack may error on a version mismatch — pass `--pm-on-fail=ignore`. Workspace catalog (`pnpm-workspace.yaml`) centralises shared dep versions (vite, vitest, wrangler, `@mrmartineau/kit`, Cloudflare plugins).

## Conventions

- **Lint/format:** Biome, config at `biome.json` extending `@mrmartineau/kit`. Single quotes, no semicolons. Run `pnpm check`.
- **Commits & releases:** Conventional Commits drive `semantic-release` with `semantic-release-monorepo` — each package versions independently from its own commits. `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major. Scope commits to the package (`feat(web): …`). Releases are GitHub releases only; nothing publishes to npm.
- **Setup/ops:** full Supabase + Cloudflare walkthrough in `docs/setup-instructions.md`. Migration notes in `docs/`.
