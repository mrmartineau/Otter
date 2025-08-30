<div align="center">

  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/Otter/refs/heads/main/packages/web/public/otter-logo.svg"
        width="90"
        height="90"
      /><br/>Otter</h1>

> Otter is a self-hosted bookmark manager made with React and [Supabase](https://supabase.com) and hosted on [Cloudflare](https://cloudflare.com)

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
- [Supabase](https://supabase.com) account and the [Supabase CLI](https://supabase.com/docs/reference/cli/introduction) - install with `npm i -g supabase`
- [Cloudflare](https://cloudflare.com) account (optional) - used for the page scraper and Mastodon to Supabase worker

## Otter ecosystem

I use various other tools to make Otter even better:

- [Raycast extension](https://www.raycast.com/mrmartineau/otter) (on the Raycast extension store)
- [Chrome extension](https://github.com/mrmartineau/otter-extension) (not currently on the Chrome webstore)
- [Apple Shortcut](https://github.com/mrmartineau/Otter/blob/main/public/Add%20to%20Otter.shortcut) - download this shortcut and update your Otter instance URL within it. Then you can add it to your iOS share sheet and quickly add new bookmarks to Otter
- [Mastodon to Supabase Cloudflare worker](https://github.com/mrmartineau/mastodon-to-supabase) used to backup my Mastodon toots to Supabase

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
