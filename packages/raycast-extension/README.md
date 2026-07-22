<div align="center">
  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/raycast-extensions/main/otter/assets/command-icon.png"
        width="90"
        height="90"
      /><br/>Otter bookmarking</h1>

Raycast extension for [Otter](https://github.com/mrmartineau/Otter) bookmarks, a self-hosted bookmarking app created by [Zander Martineau](https://zander.wtf)

  <p>
    <a href="https://www.raycast.com/mrmartineau/otter">
      <img src="https://img.shields.io/badge/Raycast-Store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/MrMartineau/Otter/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="Otter is released under the MIT license."
      />
    </a>
    <a href="https://main.elk.zone/toot.cafe/@zander">
      <img src="https://img.shields.io/mastodon/follow/90758?domain=https%3A%2F%2Ftoot.cafe" alt="Follow @zander" />
    </a>
  </p>
</div>

## Features

- Search your Otter bookmarks
- Browse your recent Otter bookmarks
- Add a new bookmark to Otter
- Menubar showing your recent bookmarks, types and top 10 tags

## Extension settings

- `oauthClientId` - your Raycast OAuth client ID from Otter
- `otterBasePath` - the base URL of your Otter instance
- `showDetailView` - whether to show the detail view or list view when searching for bookmarks

## OAuth setup

The extension signs in through your Otter instance using Better Auth OAuth. Ask the Otter operator for the Raycast OAuth client ID, then set:

- `OAuth Client ID` to that client ID
- `Otter Instance URL` to the same base URL configured as `BETTER_AUTH_URL` on the Otter server

## Note

This extension relies on an instance of Otter being setup and running. You can find the source code for Otter [here](https://github.com/mrmartineau/Otter).

> Made by Zander Martineau • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
