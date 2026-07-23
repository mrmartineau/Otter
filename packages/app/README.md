<div align="center">

  <h1><img
        src="https://raw.githubusercontent.com/mrmartineau/Otter/refs/heads/main/packages/web/public/otter-logo.svg"
        width="90"
        height="90"
      /><br/>Otter for macOS &amp; iOS</h1>

> Native macOS/iOS app for [Otter](https://github.com/mrmartineau/otter) — a Safari web extension plus a share-sheet extension for saving pages to your Otter instance

</div>

## What's in here

An Xcode project (`otter/Otter.xcodeproj`) with the following targets:

| Target | Description |
| --- | --- |
| `macOS (App)` / `iOS (App)` | Host apps that install the Safari extension |
| `macOS (Extension)` / `iOS (Extension)` | Safari web extension — save the current page to Otter |
| `Otter Share` | Share-sheet extension — save from any app via the system share menu |
| `Shared (App)` / `Shared (Extension)` | Code and resources shared across platforms |

## Building

1. Open `otter/Otter.xcodeproj` in Xcode
2. Select the `macOS (App)` or `iOS (App)` scheme
3. Build and run

The app talks to your Otter instance's REST API (see [`packages/web`](../web)). Configure your instance URL in the extension settings.

## Releasing

This package is distributed through the App Store and is **not** part of the repo's semantic-release workflow.

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
