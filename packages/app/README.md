<div align="center">

  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/Otter/refs/heads/main/packages/web/public/otter-logo.svg"
        width="90"
        height="90"
      /><br/>Otter for macOS &amp; iOS</h1>

> Native iOS app for [Otter](https://github.com/mrmartineau/otter), plus a Safari web extension and a share-sheet extension for saving pages to your Otter instance

</div>

## What's in here

An Xcode project (`otter/Otter.xcodeproj`) with the following targets:

| Target | Description |
| --- | --- |
| `iOS (App)` | Native SwiftUI app — sign in with OAuth, browse your bookmarks |
| `macOS (App)` | Host app that installs the Safari extension (still web-view based) |
| `macOS (Extension)` / `iOS (Extension)` | Safari web extension — save the current page to Otter |
| `Otter Share` | Share-sheet extension — save from any app via the system share menu |
| `Shared (Core)` | API client, OAuth, keychain and the shared save-bookmark UI |
| `Shared (App)` / `Shared (Extension)` | Code and resources shared across platforms |

## The iOS app

Everything goes through your instance's REST API (see [`packages/web`](../web)) — no web views.

- **Auth:** OAuth 2.1 with PKCE via `ASWebAuthenticationSession`. The app registers
  itself with your instance using RFC 7591 dynamic client registration, so there is
  no client ID to configure — just enter your instance address on the sign-in screen.
  Tokens live in a keychain group shared with the share extension
  (`$(AppIdentifierPrefix)zander.martineau.otter`), and are refreshed automatically.
- **Bookmarks:** `GET /api/bookmarks`, paginated 25 at a time. The first page is
  cached to disk so the list renders instantly at launch, then refreshes in the
  background.
- **Saving:** `POST /api/new` with `scrape: true`, from the share sheet, the `+`
  button, `otter://save?url=…`, or the "Save Bookmark" Shortcuts action.

Your Otter instance must allow dynamic client registration — this repo's
`packages/web/auth/server.ts` enables it, so deploy the Worker before signing in.

## Building

1. Open `otter/Otter.xcodeproj` in Xcode
2. Select the `iOS (App)` or `macOS (App)` scheme
3. Build and run

iOS 17 or later. The app and the share extension both need the Keychain Sharing
capability, which automatic signing adds for you on first device build.

## Releasing

This package is distributed through the App Store and is **not** part of the repo's semantic-release workflow.

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
