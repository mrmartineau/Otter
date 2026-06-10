/**
 * Shared, platform-agnostic catalog of external platforms that Otter can
 * sync saved items from (Bluesky bookmarks, GitHub stars, YouTube likes…).
 *
 * This module is pure data so it can be imported from both the Worker
 * (sync + API) and the SPA (generated settings forms, feed pages, sidebar).
 * To add a new platform: add an entry here, then register a fetcher for the
 * same id in `worker/platforms/registry.ts`.
 */

export interface PlatformCredentialField {
  key: string
  label: string
  note?: string
  placeholder?: string
  type: 'text' | 'password'
}

export interface PlatformDefinition {
  /** Fields the user must provide to connect — drives the generated settings form */
  credentialFields: PlatformCredentialField[]
  /** Short explanation shown in the settings UI */
  description: string
  helpUrl?: string
  id: string
  /** What a single synced item is called, e.g. 'bookmark', 'starred repo' */
  itemName: string
  /** Platform name, e.g. 'Bluesky' */
  name: string
  /** Feed page + sidebar title, e.g. 'Bluesky bookmarks' */
  title: string
}

export const PLATFORMS = {
  bluesky: {
    credentialFields: [
      {
        key: 'handle',
        label: 'Handle',
        placeholder: 'yourname.bsky.social',
        type: 'text',
      },
      {
        key: 'appPassword',
        label: 'App Password',
        note: 'Create one at bsky.app/settings/app-passwords',
        placeholder: 'xxxx-xxxx-xxxx-xxxx',
        type: 'password',
      },
    ],
    description: 'Sync the posts you have saved with Bluesky bookmarks.',
    helpUrl: 'https://bsky.app/settings/app-passwords',
    id: 'bluesky',
    itemName: 'bookmark',
    name: 'Bluesky',
    title: 'Bluesky bookmarks',
  },
  github: {
    credentialFields: [
      {
        key: 'token',
        label: 'Personal access token',
        note: 'Fine-grained or classic token with read access to your starred repos',
        placeholder: 'ghp_…',
        type: 'password',
      },
    ],
    description: 'Sync the repositories you have starred on GitHub.',
    helpUrl: 'https://github.com/settings/tokens',
    id: 'github',
    itemName: 'starred repo',
    name: 'GitHub',
    title: 'GitHub stars',
  },
  youtube: {
    credentialFields: [
      {
        key: 'clientId',
        label: 'OAuth client ID',
        type: 'text',
      },
      {
        key: 'clientSecret',
        label: 'OAuth client secret',
        type: 'password',
      },
      {
        key: 'refreshToken',
        label: 'Refresh token',
        note: 'OAuth refresh token authorised with the youtube.readonly scope',
        type: 'password',
      },
    ],
    description: 'Sync the videos you have liked on YouTube.',
    helpUrl:
      'https://developers.google.com/youtube/v3/guides/auth/installed-apps',
    id: 'youtube',
    itemName: 'liked video',
    name: 'YouTube',
    title: 'YouTube likes',
  },
} as const satisfies Record<string, PlatformDefinition>

export type PlatformId = keyof typeof PLATFORMS

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[]

export const isPlatformId = (value: string): value is PlatformId =>
  value in PLATFORMS

export const getPlatform = (id: PlatformId): PlatformDefinition => PLATFORMS[id]
