# Cloudflare Worker for YouTube Likes

## Context

The current YouTube likes-to-Otter pipeline uses Zapier, which is slow and unreliable. This plan replaces it with a Cloudflare Workers Cron Trigger on the existing `otter-web` worker, fetching liked videos from the YouTube Data API v3 every 15 minutes and inserting them as bookmarks in Supabase.

The existing worker already has a commented-out `scheduled` handler stub (`worker/index.ts:7`), Supabase client infrastructure, and bookmark creation patterns to build on.

## Approach

Use the YouTube Data API v3 `playlistItems.list` endpoint with the special `LL` (Liked List) playlist ID. This returns liked videos in reverse chronological order, which is ideal for incremental syncing — we fetch the newest likes and stop when we hit one that's already been imported.

OAuth2 refresh token flow handles authentication: the worker exchanges a stored refresh token for a short-lived access token on each cron invocation.

## New Secrets Required

Set via `wrangler secret put <NAME>`:

| Secret | Purpose |
|--------|---------|
| `YOUTUBE_CLIENT_ID` | Google OAuth2 client ID |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth2 client secret |
| `YOUTUBE_REFRESH_TOKEN` | Long-lived OAuth2 refresh token for the user's Google account |
| `OTTER_API_KEY` | The user's Otter API key from the `profiles` table (for resolving user ID) |

The worker already has `SUPABASE_SERVICE_KEY` and access to `VITE_SUPABASE_URL` (baked in at build time via `import.meta.env`) — no additional DB secrets needed.

## Files to Modify

### 1. `packages/web/wrangler.jsonc`
Add cron trigger configuration:
```jsonc
"triggers": {
  "crons": ["*/15 * * * *"]
}
```

### 2. `packages/web/worker/index.ts`
Enable the `scheduled` handler with a **cron dispatcher pattern** so future cron jobs can be added easily. The `event.cron` property tells us which schedule triggered the handler:
```typescript
import { fetchAndStoreYouTubeLikes } from './youtube/fetch-likes'

export default {
  fetch: app.fetch,
  scheduled: async (event, env, ctx) => {
    switch (event.cron) {
      case '*/15 * * * *':
        ctx.waitUntil(fetchAndStoreYouTubeLikes(env))
        break
      // Add future cron jobs here, e.g.:
      // case '0 * * * *':
      //   ctx.waitUntil(someHourlyTask(env))
      //   break
      default:
        console.log(`Unknown cron schedule: ${event.cron}`)
    }
  },
}
```
This pattern means adding a new cron job is two steps: add the cron expression to `wrangler.jsonc`'s `triggers.crons` array, and add a `case` branch here.

### 3. `.github/workflows/deploy.yml`
Add the new secrets to the env block:
```yaml
YOUTUBE_CLIENT_ID: ${{secrets.YOUTUBE_CLIENT_ID}}
YOUTUBE_CLIENT_SECRET: ${{secrets.YOUTUBE_CLIENT_SECRET}}
YOUTUBE_REFRESH_TOKEN: ${{secrets.YOUTUBE_REFRESH_TOKEN}}
OTTER_API_KEY: ${{secrets.OTTER_API_KEY}}
```

## Files to Create

### 4. `packages/web/worker/youtube/fetch-likes.ts`
Core module — the scheduled handler entry point. Responsibilities:

1. **Get access token**: Exchange `YOUTUBE_REFRESH_TOKEN` for a short-lived access token via Google's OAuth2 token endpoint (`https://oauth2.googleapis.com/token`) using a standard `POST` with `grant_type=refresh_token`
2. **Fetch liked videos**: Call `playlistItems.list?playlistId=LL&part=snippet&maxResults=50` with the access token as a Bearer header
3. **Deduplicate**: Build canonical URLs (`https://www.youtube.com/watch?v={videoId}`) for each liked video, then query Supabase `bookmarks` table filtering by those URLs to find which already exist
4. **Insert new bookmarks**: For each new liked video, insert into `bookmarks` with:
   - `url`: `https://www.youtube.com/watch?v={videoId}`
   - `title`: from YouTube API `snippet.title`
   - `description`: from YouTube API `snippet.description` (truncated to 500 chars)
   - `image`: highest resolution thumbnail from `snippet.thumbnails` (prefer `maxres` → `high` → `medium` → `default`)
   - `type`: `'video'`
   - `star`: `false`
   - `status`: `'active'`
   - `tags`: `['like:youtube']` — allows filtering/identifying auto-imported YouTube likes
   - `user`: looked up from profiles table via `OTTER_API_KEY`
5. **Pagination**: If all 50 results are new (first run or large backlog), follow `nextPageToken` to fetch more pages. Stop when we encounter an already-imported video or run out of pages. Cap at 10 pages (500 videos) per run to avoid runaway execution.

Key implementation details:
- Access secrets via `import { env } from 'cloudflare:workers'` (consistent with existing pattern in `worker/supabase/client.ts:1`)
- Reuse `supabaseUrl` from `@/utils/supabase/client` (build-time constant via `import.meta.env.VITE_SUPABASE_URL`)
- Use `getUserProfileByApiKey` from `@/utils/fetching/user` to resolve the user from `OTTER_API_KEY`
- Batch deduplication: query `bookmarks.url.in([...urls])` for all 50 URLs at once
- Skip playlist items where `snippet.resourceId.videoId` is missing (deleted/private videos surface as items with no video ID)
- Log results for observability (the worker has `observability: { enabled: true }`)

### 5. `packages/web/worker/youtube/types.ts`
TypeScript types for YouTube API responses:
- `YouTubePlaylistItemsResponse` — the paginated response from `playlistItems.list`
- `YouTubePlaylistItem` — individual item with `snippet` containing `title`, `description`, `thumbnails`, `resourceId.videoId`
- `YouTubeTokenResponse` — the OAuth2 token exchange response

## Error Handling

- **Expired/revoked refresh token**: Log error with a clear message ("YouTube refresh token expired — re-authorize and update the YOUTUBE_REFRESH_TOKEN secret"), return early
- **YouTube API quota exceeded (HTTP 403)**: Log error, return early. The 15-minute schedule with 50 results/page uses ~96 units/day (well within the 10,000 daily quota)
- **Unavailable videos in LL playlist**: YouTube's LL playlist can halt pagination if a liked video becomes private/deleted. Skip items where `snippet.title === "Private video"` or `snippet.title === "Deleted video"` or where `resourceId.videoId` is missing
- **Supabase errors**: Log error for individual insert failures but continue processing remaining videos
- **Missing secrets**: Check for required env vars (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `OTTER_API_KEY`) at start, log which are missing and return early
- **Network failures**: Wrap YouTube API calls in try/catch. On transient errors (5xx, network timeout), log and let the next 15-minute cron retry naturally — no manual retry loop needed

## Risks & Mitigations

### 1. Google OAuth Refresh Token 7-Day Expiry (CRITICAL)
**Risk**: If the Google Cloud project's OAuth consent screen is in "Testing" mode, refresh tokens expire after **7 days**. The `youtube.readonly` scope is NOT a basic profile scope, so the 7-day limit applies.

**Mitigation**: The Google Cloud project **must** be published to "Production" mode. For a personal/internal-use app that only accesses your own account, this requires:
- Completing the OAuth consent screen configuration
- Clicking "Publish App" in Google Cloud Console → APIs & Services → OAuth consent screen
- **Critical gotcha**: After switching from Testing to Production, you must create **new** OAuth credentials. Old credentials retain the 7-day expiry.

Even in Production mode, refresh tokens can be revoked if:
- Not used for 6 consecutive months (our 15-min cron prevents this)
- The user removes the app from their Google Account
- The 100-token-per-client limit is exceeded (unlikely for personal use)

### 2. LL Playlist 5,000 Video Cap
**Risk**: YouTube only keeps the most recent 5,000 likes in the LL playlist. Historical likes beyond 5,000 are invisible to the API.

**Impact**: Minimal for ongoing sync. Only matters for initial backfill if you have >5,000 liked videos.

### 3. Unavailable Videos Breaking Pagination
**Risk**: The LL playlist can include items for deleted/private videos. These may have empty/sentinel titles and missing video IDs, potentially causing errors or inserting junk bookmarks.

**Mitigation**: Filter out items where `snippet.title` is "Private video" / "Deleted video" or where `snippet.resourceId.videoId` is undefined before processing.

### 4. Local Testing Not Working (Known Cloudflare Bug)
**Risk**: There's an open Cloudflare bug ([workers-sdk #9882](https://github.com/cloudflare/workers-sdk/issues/9882)) where the `/__scheduled` endpoint doesn't work with Workers that use static assets + Vite. The SPA fallback routing intercepts the test endpoint.

**Mitigation**:
- Add a **temporary debug API route** (`GET /api/debug/youtube-likes`) during development that calls the same `fetchAndStoreYouTubeLikes()` function. This allows testing via curl against the local dev server. Remove before production.
- Test in production using `wrangler tail` to watch logs after the first cron execution.

### 5. URL Deduplication with Manually-Added YouTube Bookmarks
**Risk**: If a YouTube video was manually bookmarked with a different URL format (`youtu.be/ID`, `youtube.com/watch?v=ID&t=30`), the deduplication check (which queries for the canonical `youtube.com/watch?v=ID` URL) won't catch it, creating a duplicate.

**Mitigation**: Accept this as a minor edge case. The canonical URL format is consistent for all auto-imported likes, so duplicates only arise from manual bookmarks of the same video. These can be cleaned up manually and the likelihood is low.

### 6. CPU Time Limits
**Risk**: Cloudflare Workers have CPU time limits for scheduled handlers (50ms free tier, 30s paid default, up to 5 min configurable).

**Mitigation**: The actual CPU work is minimal — JSON parsing and URL comparison. All network time (YouTube API calls, Supabase queries) is excluded from CPU time measurement. Even with 10 pages of pagination, CPU time should be well under 1 second. The 10-page cap (500 videos) provides an additional safety net.

## Prerequisites (Manual Steps)

Before the worker can run, the user needs to:

1. **Create a Google Cloud project** and enable the YouTube Data API v3
2. **Configure the OAuth consent screen**:
   - Set user type to "External"
   - Add the scope `https://www.googleapis.com/auth/youtube.readonly`
   - **Publish the app to "Production" mode** (critical — Testing mode tokens expire in 7 days)
3. **Create OAuth2 credentials** (type: Web application) to get `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`. If you previously had credentials in Testing mode, create **new** credentials after publishing.
4. **Obtain a refresh token** by running through the OAuth2 consent flow. Options:
   - Use [Google's OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) — set it to use your own credentials, authorize the `youtube.readonly` scope, exchange for a refresh token
   - Or write a small one-off script to complete the consent flow
5. **Set secrets** in Cloudflare:
   ```bash
   cd packages/web
   wrangler secret put YOUTUBE_CLIENT_ID
   wrangler secret put YOUTUBE_CLIENT_SECRET
   wrangler secret put YOUTUBE_REFRESH_TOKEN
   wrangler secret put OTTER_API_KEY
   ```
6. **Add secrets to GitHub** repository settings for the deploy workflow

## Verification

1. **Debug route (dev only)**: Add a temporary `GET /api/debug/youtube-likes` route that calls `fetchAndStoreYouTubeLikes()` directly. Test with `curl -H "Authorization: Bearer <key>" http://localhost:5678/api/debug/youtube-likes`
2. **Production logs**: After deployment, run `wrangler tail` and wait for the first cron execution (up to 15 min). Verify logs show successful token exchange, fetched videos, and inserted bookmarks
3. **Database check**: Query Supabase for bookmarks with `tags @> '{youtube-like}'` to confirm imports
4. **Deduplication**: Wait for two cron cycles and verify no duplicate bookmarks are created
5. **UI check**: Open Otter's web UI and filter by type `video` to see imported YouTube likes
