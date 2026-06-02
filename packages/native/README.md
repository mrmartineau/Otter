# @mrmartineau/otter-native

Expo / React Native iOS + iPadOS app that wraps [Otter](https://otter.zander.wtf)
in a full-screen WebView, with a native Share Extension for saving bookmarks
from any app.

## What's here

| Concern | Where | Notes |
| --- | --- | --- |
| Full-screen WebView | `App.tsx` | Loads `https://otter.zander.wtf`. |
| Persistent auth | `App.tsx` | `sharedCookiesEnabled` + `thirdPartyCookiesEnabled` so logins survive restarts. |
| External links → Safari | `App.tsx` `onShouldStartLoadWithRequest` | Only **user taps** on non-Otter hosts open in Safari; OAuth redirects stay in the WebView. |
| Loading indicator | `src/LoadingOverlay.tsx` | Opaque brand-coloured overlay until first paint — no white flash. |
| Offline / error state | `src/ErrorView.tsx` + NetInfo | Distinguishes offline from load failure; auto-retries on reconnect. |
| Share Extension | `targets/share/` | Native Swift target via `@bacons/apple-targets`, ported from `packages/app/otter`. Opens `…/new/bookmark` with the shared URL. |
| iPad + iPhone | `app.json` `ios.supportsTablet`, `requireFullScreen:false` | Universal app, supports Stage Manager / multitasking. |

## Setup

This is a **dev-client / prebuild** app (the Share Extension is native, so it
cannot run in Expo Go).

```bash
# from the repo root
pnpm install

cd packages/native

# Reconcile dependency versions against the installed Expo SDK
npx expo install --fix

# 1. Set your Apple Team ID in app.json → plugins → @bacons/apple-targets
#    (required so the extension target is signed with the right team).

# 2. Generate the native iOS project (creates ./ios, runs the apple-targets
#    config plugin to add the Share Extension target).
pnpm prebuild

# 3. Build & run on a simulator or device
pnpm ios            # or: npx expo run:ios --device
```

`ios/` and `android/` are generated and git-ignored — re-run `pnpm prebuild`
after changing `app.json`, the target config, or the Swift sources.

## Day-to-day development

After the first `pnpm ios` build is installed on the simulator/device, you
usually only need the Metro bundler running:

```bash
cd packages/native
pnpm start            # Metro; press `i` to open the installed dev build
```

- JS/TS changes hot-reload over Metro — no rebuild.
- Native changes (Swift in `targets/share/`, new native deps, `app.json`
  iOS keys, plugins) require `pnpm prebuild` + `pnpm ios` again.
- Metro is configured for this pnpm monorepo in `metro.config.js` (watches the
  repo root, resolves from both package and root `node_modules`).

## Building & releasing (EAS)

Distribution uses [EAS Build + Submit](https://docs.expo.dev/eas/). Profiles
live in `eas.json`. The Share Extension is a native target, so every store
build must be a full native build (no Expo Go).

### One-time setup

```bash
npm i -g eas-cli
eas login                       # Expo account
cd packages/native
eas build:configure             # links project, writes the EAS project id

# Fill in the placeholders:
#  - app.json    → @bacons/apple-targets `appleTeamId`
#  - eas.json    → submit.production.ios `ascAppId` + `appleTeamId`
# Create the App Store Connect app record (bundle id wtf.zander.otter) first;
# `ascAppId` is its numeric Apple ID.
```

Credentials (signing certs, provisioning profiles for **both** the app and the
`Otter Share` extension) are managed by EAS on first build — accept the prompts
to let EAS generate them.

### Cut a release

```bash
cd packages/native

# 1. Build a signed .ipa in the cloud
pnpm build:prod                 # eas build --profile production --platform ios

# 2. Upload to TestFlight / App Store Connect
pnpm submit:prod                # eas submit --profile production --platform ios
```

- `production` profile has `autoIncrement: true` and `appVersionSource:
  "remote"` — EAS bumps the build number; bump the marketing version in
  `app.json` (`expo.version`) for a user-facing release.
- `pnpm build:preview` produces an internal-distribution build (ad-hoc devices)
  for testing without TestFlight.
- `pnpm build:dev` produces a simulator dev-client build.

### Local archive (alternative to EAS)

```bash
pnpm prebuild
open ios/Otter.xcworkspace      # Product ▸ Archive ▸ Distribute App in Xcode
```

### OTA / over-the-air updates

JS-only fixes can ship without a store review via `expo-updates`:

```bash
npx expo install expo-updates
eas update:configure
eas update --branch production --message "fix: …"
```

Native changes (anything touching the Share Extension or native deps) always
require a new store build — OTA cannot update native code.

## Tuning notes

- **Otter URL** lives in `src/config.ts` (`OTTER_URL` / `OTTER_HOST`). Change
  both if the deployment moves.
- **External-link rule**: `isOtterUrl()` treats `otter.zander.wtf` and its
  subdomains as internal. Anything else opened via a link **tap** is handed to
  Safari. Non-`http(s)` schemes (`mailto:`, `tel:`…) always go to the OS.
- **Share Extension** reuses the bottom-sheet WebView from the original native
  app and is restricted to web URLs via
  `NSExtensionActivationSupportsWebURLWithMaxCount` in
  `targets/share/Info.plist`.
- **Cookies in the extension**: it uses `WKWebsiteDataStore.default()` so the
  session is shared with Safari/WKWebView storage. If you later want the
  extension and main app to share a *private* session, add an App Group and
  switch to a shared data store.
