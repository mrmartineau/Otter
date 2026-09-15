# Otter Reader plan

Read-it-later for Otter, plus Hacker News, Lobsters, Techmeme and RSS, in one native iOS app. Free news reader with no account. First save creates an Otter account. Otter bookmarks and the media tracker are the cross-sell.

Scope: the iOS app and the API it needs. The web UI stays as it is. Lives in the Otter monorepo. This doc assumes Otter runs Hono on Workers with Better Auth, Neon and Drizzle (the zero-to-one stack). Adjust where that's wrong.

## Status (15 September 2026)

Built in one pass, uncommitted on `main`. Verified: `tsc -b`, vitest (49 tests), Biome, an Xcode simulator build of the app and share extension, and screenshots of every tab with live feeds.

Done
- API: `reading_items` and `highlights` tables (migration `0005_reader.sql`), `/api/reader/items` CRUD with inline extraction, `?since=` sync with tombstones, re-extract, highlight CRUD. Progress never moves backwards. Saving is rate limited with the scraper.
- iOS: tabs Read later, Feeds, Library, Settings. Feeds work signed out; the sign-in sheet appears on first save. Reading list with archive, star, remove, pull to sync, offline cache and a replayed mutation queue. Reader shows stored content, tracks scroll progress, has a bottom bar and a text-size setting. Share sheet has a one-tap Read later plus the full form. Background refresh syncs the list and feeds.
- Feeds: Hacker News (Algolia), Lobsters, Techmeme, RSS/Atom/JSON Feed via XMLParser (no FeedKit). Native collapsible comments for HN and Lobsters. Subscriptions, OPML import and export, read and starred state, last tab and feed remembered.

Skipped, and why
- Native email/Sign in with Apple forms. The existing OAuth sign-in works today; SIWA needs the Apple capability and portal setup first. Sign-in gate moved instead.
- CloudKit feed state. Local UserDefaults for now; the shape (sets of item IDs) maps straight onto CloudKit.
- Highlights UI on iOS. The API and tables exist; selecting text in a SwiftUI `Text` article is the hard part.
- R2 image proxy, Browser Rendering tier, free-tier middleware, hosted-signup prerequisites, OpenAPI codegen, widgets, App Intents, payments. Nothing in the app depends on them yet.
- Offline queue in the share extension. No App Group container exists; a failed save shows the error.

## Decisions

Made here so the rest of the doc doesn't relitigate them.

1. Feeds run on-device. HN, Lobsters, Techmeme and RSS are fetched and parsed in the app. Zero server cost for free users, no signup wall to read news. Read state syncs via CloudKit, not Otter. This reverses my earlier "ingest server-side" advice, which assumed one user with a server. For a public app, on-device is the free tier. Otter's existing server-side RSS parser stays for the web app; if Pro ever wants cross-device feed sync through Otter, it's already there.
2. Read-later runs on the server. Extraction, storage, progress and highlights live in Otter. This is the feature that needs an account, so it is the signup moment.
3. A read-later item is an Otter bookmark with type = article, plus a reading row. The reading list is the join on reading_items, not the type; type = article is set on save so the web app's existing article filter shows them with no web changes. Saved articles appear in Otter web for free. That is the cross-sell doing itself.
4. Hosted Otter is a product. The funnel only works if strangers can sign up without hosting anything. Self-hosters keep working via a custom server URL in settings.
5. Native auth, no redirect dance. SwiftUI sign-up and sign-in forms talking to Better Auth over bearer tokens. Sign in with Apple from day one.
6. One app, not two. Evolve the existing iOS target and keep its bundle ID, so current installs upgrade in place. The app already has native bookmarks, tags, collections, search, sign-in and an article reader; keep all of it under a Library tab. The reader (Read later, Feeds) is the front door. The display name is a store-listing decision made at launch, not a code change.
7. Ship free. Payments in 1.1 once there is something worth gating. Define the free/paid line now.

## Funnel

install → read feeds, no account → tap "Read later" → 20-second signup (SIWA or email) → saved articles also visible on Otter web → in-app nudge after about 10 saves ("Otter also does bookmarks, tags, collections and a media tracker") → Pro upgrade

Free: unlimited feeds, 100 active read-later items, highlights, offline.

Pro (£5/mo, £48/yr, £199 lifetime, the pricing you already considered): unlimited items, full-text search across saved articles, AI summaries and tag suggestions via Workers AI, hosted Otter in full.

Don't gate highlights or offline. They are the reason to pick this over Safari Reading List.

## Architecture

```
iOS app (SwiftUI, SwiftData)
├── Feeds module        HN (Algolia + Firebase), Lobsters JSON, Techmeme RSS, RSS/Atom (FeedKit)
│   └── state → CloudKit private DB (read, starred, subscriptions)
├── Reader module       reading list, article view (MarkdownUI), highlights, progress
│   └── state → Otter API, offline mutation queue in SwiftData
├── Share extension     "Read later" and "Bookmark" → Otter API directly
└── OtterAPI package    generated from OpenAPI (swift-openapi-generator)

Otter API (Hono on Workers)
├── /api/auth/*         Better Auth + bearer plugin + Sign in with Apple
├── /v1/reader/*        items, sync, highlights, progress, search
├── extraction          existing xtractr pipeline → markdown, images to R2
└── Neon Postgres via Drizzle
```

Save flow: app POSTs a URL → API creates bookmark + reading row (state pending) → extraction runs via Queue or waitUntil → app picks it up on next sync → SwiftData caches content for offline.

## Data model

New tables, every one keyed by user_id. Soft deletes everywhere, sync needs tombstones.

reading_items
- id, user_id, bookmark_id (FK, unique)
- state: pending | ready | failed | archived
- content_md (text), content_hash
- author, site_name, published_at (title and image live on bookmarks)
- word_count, reading_time_s
- progress (real 0..1), last_position (text anchor), last_read_at
- extraction_tier: static | rendered | none
- created_at, updated_at, deleted_at

highlights
- id, user_id, reading_item_id
- exact, prefix, suffix (W3C TextQuoteSelector, survives re-extraction)
- note, color
- created_at, updated_at, deleted_at

entitlements
- user_id, tier: free | pro | lifetime
- source: apple | stripe | manual
- product_id, original_transaction_id, expires_at, updated_at

devices (later, for push)
- user_id, apns_token, platform, updated_at

bookmarks needs nothing new. It has type (article is a value) and status (active | inactive). "Read later" sets type = article. Archived lives in reading_items.state, not bookmarks.status, which means something else.

## API

All under /v1/reader, bearer auth, JSON. Spec via hono-openapi so the Swift client is generated, not hand-written.

- POST /items  { url, source?: hn | lobsters | techmeme | rss | share, source_ref? } → 202 + item. Creates the bookmark with type = article and the reading row.
- GET /items?state=&cursor=
- GET /items/:id  full content
- PATCH /items/:id  state, progress, last_position
- DELETE /items/:id
- POST /items/:id/reextract
- GET /sync?since=  { items[], highlights[], tombstones[], cursor }
- POST /sync  batched mutations from the offline queue, idempotent by client_id
- POST /highlights, PATCH /highlights/:id, DELETE /highlights/:id
- GET /search?q=  Pro. Postgres tsvector over content_md, or whatever Otter search already uses
- GET /me  user, entitlement, limits
- POST /account/delete  App Store requires it

Conflict rules: progress = max(server, client). Highlights merge by id, last write wins on note and color. Archived beats unread.

## Extraction

Two tiers, then give up honestly.

1. Static. The xtractr pipeline Otter already runs on Workers, exposed today as api/scrape-content, which the iOS ArticleReaderView already calls live. New work is persisting the output: the markdown path, rewriting img src to an Otter image proxy backed by R2 (offline works, hotlinks don't rot), and storing content_md plus word count.
2. Rendered. Cloudflare Browser Rendering for pages that come back empty (JS-only sites). It's paid, so cap per user per day.
3. None. Mark failed, app shows title plus "Open in browser". Don't hide failures.

Paywalls: don't try. Return what an anonymous fetch gets.

## iOS app

Targets: OtterReader (app), ShareExtension, WidgetExtension later. Swift packages for OtterAPI, OtterCore (models, sync, queue), Feeds, Reader, DesignSystem. iOS 18 minimum.

Tabs
- Read later. Unread and archived. Swipe to archive. Pull to sync.
- Feeds. Sections for HN, Lobsters, Techmeme, RSS. Each row has save, comments, open link.
- Library. The existing Bookmarks, Tags, Collections and Types views, plus Search (Pro: full-text over saved articles).
- Settings. Account, custom server URL (advanced), OPML import/export, appearance.

Article view
- MarkdownUI for rendering. Custom theme, font size, serif or sans, measure. Code blocks, tables, footnotes.
- Select text → highlight, optional note. Stored as TextQuoteSelector so it survives re-extraction.
- Progress from scroll offset, debounced, synced on background.
- Bottom bar: archive, star (Otter star), tags (Otter tags), share, open original.

Comments
- HN: Algolia /api/v1/items/:id returns the whole tree in one call. Firebase is per-item and slow, use it only for live scores.
- Lobsters: /s/:id.json includes comments.
- Native collapsible threads. Never leave the app to read a thread.

Feeds
- One protocol, FeedSource { fetch() → [FeedItem] }, four implementations. A new source is one file.
- HN via Algolia front page plus Firebase top/new IDs. Lobsters /hottest.json, /newest.json, /t/:tag.json, paginated as /page/N.json (query-string paging pollutes their cache and gets redirected). Techmeme main feed and the firehose RSS. RSS, Atom and JSON Feed via FeedKit.
- Refresh on foreground, BGAppRefreshTask in the background. iOS promises nothing there, fine for news.
- Read state, starred, subscriptions in the CloudKit private database. No Otter involvement.
- OPML import is non-negotiable for Reeder switchers.

Share extension
- Two actions: Read later, Bookmark. Read later forces type = article and adds the reading row. Bookmark keeps auto-detect. Both call the API with the bearer token from the App Group keychain. No web view. The current "open the add page" behaviour goes.
- Offline: queue in the App Group container, drain on next launch.

Offline
- SwiftData holds items, content_md and image cache (R2 URLs with long max-age through URLCache). Every mutation carries a client_id.

## Auth

Better Auth with the bearer plugin. The app calls:
- POST /api/auth/sign-up/email
- POST /api/auth/sign-in/email
- POST /api/auth/sign-in/social { provider: apple, idToken } from ASAuthorizationAppleIDCredential
- GET /api/auth/get-session
- POST /api/auth/sign-out

Token in Keychain, shared with the extension via App Group. Signing up in the app creates the Otter web account. Same user table, nothing to link, no redirect.

A redirect flow only matters if you add GitHub or Google. Then ASWebAuthenticationSession with an otter://auth/callback scheme and Better Auth's callbackURL. Skip for 1.0.

Apple rules that bite: Sign in with Apple is mandatory once any third-party login exists (guideline 4.8). In-app account deletion is mandatory (5.1.1(v)). Review wants a demo account.

## Hosted Otter prerequisites

Before strangers can sign up:
- Every table has user_id and every query filters on it. Audit, don't assume.
- Open signup, rate-limited, email verification (Resend or similar).
- Free-tier limits enforced in API middleware, not the client.
- Privacy policy and terms at otter.zander.wtf/legal.
- Data export endpoint. GDPR, and cheap.
- Usage alerts on Neon and Workers.

Self-hosters: Settings has "Custom server". Same app, same API. Their instance decides the entitlement; a self-hosted instance can return pro for everyone.

## Payments (1.1, not 1.0)

StoreKit 2. Auto-renewing subscriptions for monthly and yearly, non-consumable for lifetime. The app POSTs the JWS transaction to /v1/entitlements/apple; the server verifies via App Store Server API and writes entitlements. Web reads the same table, so Pro bought in the app unlocks hosted Otter web. Stripe lands later with source stripe, same table.

Small Business Program takes Apple's cut to 15%. RevenueCat is the escape hatch if server-side receipt handling eats a week. The entitlement table doesn't change either way.

## Phases

0. Spikes (2 to 3 days)
   - Better Auth bearer plus SIWA from Swift.
   - MarkdownUI on 20 real xtractr outputs. Native vs WKWebView decided on evidence, not preference.
   - hono-openapi → swift-openapi-generator round trip.
1. API (1 to 2 weeks)
   - Migrations, /v1/reader routes, extraction pipeline, sync, account deletion, OpenAPI spec, free-tier middleware.
2. iOS core (2 to 3 weeks)
   - Move the sign-in gate from launch to first save. Add the reading list. Extend the existing ArticleReaderView and MarkdownContentView. Fold the existing views into a Library tab. Share extension, offline queue, progress sync. Most of the shell already exists.
   - Dogfood. Replace your own read-later habit with it.
3. Feeds (1 to 2 weeks)
   - Four sources, comments, CloudKit state, OPML. Then delete the HN app, both web clips and Reeder from your phone. If you can't, it isn't done.
4. Polish (1 week)
   - Highlights with notes, Pro search, widgets (unread count, latest saved), App Intents for Shortcuts, empty states.
5. Launch
   - Hosted prerequisites above. TestFlight with a handful of people. Listing, screenshots, privacy labels, demo account.
6. Monetise (1.1)
   - StoreKit 2, entitlements, gate Pro. Grandfather everyone who signed up before it shipped.

Roughly 6 to 9 weeks at your recent pace.

## Risks

- Extraction quality on JS-only and image-heavy pages. Browser Rendering fallback is paid, so the per-user cap matters. Track the failed rate after launch.
- Hosting other people's data. Backups, abuse, a support inbox. Small but real. Size the free cap partly to bound this.
- Techmeme and Lobsters publish no rate limits. Cache hard, identify the app in the UA, link out generously.
- CloudKit for feed state is fine on iOS. A Mac app that wants Otter-side feed state is a migration. Accept that now.
- Sync bugs kill read-later apps. Idempotent mutations and tombstones from day one, never retrofitted.

## Repo layout

```
packages/
  web/          existing Hono API and Drizzle migrations; add routes/reader/*, services/extraction/*,
                migrations for reading_items, highlights, entitlements. Web UI untouched.
  app/          existing iOS target; Packages/ for the Swift modules
  openapi/      generated spec, checked in
docs/
  otter-reader-plan.md   this file
```

## Open questions

- Is Otter multi-user today, or single-user self-hosted? Sets the size of the hosted prerequisites.
- Store name: "Otter Reader" (what people search) or "Otter" (brand)? Display name only, bundle ID stays. Decide when writing the listing. I'd go Reader.
- Free cap: 100 active items is a guess. Pick a number you'd be happy to host for 10,000 people.
- Feed sync accounts (Feedbin, Miniflux)? Not in 1.0. Ask Reeder switchers whether OPML alone is enough.
