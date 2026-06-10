import type { PlatformId } from '@/platforms/catalog'
import { fetchBlueskyBookmarks } from './bluesky'
import { fetchGithubStars } from './github'
import type { PlatformFetcher } from './types'
import { fetchYoutubeLikes } from './youtube'

/**
 * Server-side counterpart of `src/platforms/catalog.ts`: one fetcher per
 * platform id. The `satisfies` check guarantees every catalog entry has a
 * fetcher (and vice versa) at compile time.
 */
export const platformFetchers = {
  bluesky: fetchBlueskyBookmarks,
  github: fetchGithubStars,
  youtube: fetchYoutubeLikes,
} satisfies Record<PlatformId, PlatformFetcher>
