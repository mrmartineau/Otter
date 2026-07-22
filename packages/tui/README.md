# 🦦 otter-tui

A fast, dependency-free terminal UI for [Otter](https://github.com/mrmartineau/otter) — browse, search, star and save bookmarks without leaving your shell.

```
 🦦 Otter  ★ starred · #dev                          1,234 saved · page 2/66
─────────────────────────────────────────────────────────────────────────────
 ❯ ★ Building a terminal UI from scratch                              article
     zander.wtf · #dev · #tui · 3d
   ★ How Hyperdrive keeps Postgres close to your Worker                  link
     blog.cloudflare.com · #dev · #cloudflare · 2w
     A pattern language for self-hosted software                      article
     example.com · #selfhosted · 1mo

 opened zander.wtf
 ⏎ open · / search · a add · s star · d delete · t tag · i details · ? help · q quit
```

No runtime dependencies — just Node.js ≥ 20 and your Otter instance.

## Install

### Homebrew

```sh
brew install mrmartineau/tap/otter-tui
otter login   # `otter-tui` works too
```

### From source

```sh
pnpm install
pnpm --filter=@mrmartineau/otter-tui run build
node packages/tui/dist/index.js login   # or link it: `pnpm link --global` → `otter-tui`
```

`login` asks for your Otter URL and API key (Otter → Settings → API key), verifies them against `/api/me`, and writes `$XDG_CONFIG_HOME/otter/config.json` (defaulting to `~/.config/otter/config.json`). The `OTTER_BASE_URL` and `OTTER_API_KEY` environment variables override the file, so you can also skip `login` entirely.

During development you can run the TypeScript sources directly (Node ≥ 22.18):

```sh
pnpm --filter=@mrmartineau/otter-tui run dev
```

## Usage

```sh
otter-tui                   # browse your bookmarks
otter-tui add <url> [tag …] # quick-save from the command line (Otter scrapes the page)
otter-tui login             # (re)configure credentials
```

### Keybindings

| Key | Action |
| --- | --- |
| `↑`/`↓` or `j`/`k` | move selection |
| `←`/`→` or `h`/`l` | previous / next page |
| `⏎` or `o` | open in browser (registers a click) |
| `i` | bookmark details |
| `/` | search (title, URL, description, note, tag) |
| `a` | add a bookmark — paste a URL, Otter scrapes the rest |
| `s` | star / unstar |
| `d` | delete (asks for confirmation) |
| `f` | toggle the starred filter |
| `t` | pick a tag to filter by |
| `c` | cycle the type filter (article, link, video, …) |
| `x` | clear search + all filters |
| `r` | refresh |
| `?` | help |
| `q` / `ctrl-c` | quit |

## How it talks to Otter

The TUI authenticates with your profile API key as a `Bearer` token and uses the same REST API as the other Otter clients: `GET /api/bookmarks`, `GET /api/search`, `GET /api/tags`, `POST /api/new` (with server-side scraping), `PATCH`/`DELETE /api/bookmarks/:id` and `POST /api/bookmarks/:id/click`.

## Development

```sh
pnpm --filter=@mrmartineau/otter-tui run build   # tsc → dist/
pnpm --filter=@mrmartineau/otter-tui exec vitest run
```

The renderer (`src/ui.ts`) is a pure function of app state, and the input parser, text measurement and formatting helpers are pure modules with unit tests.
