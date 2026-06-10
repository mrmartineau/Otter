import {
  DEFAULT_SYNC_LIMIT,
  type PlatformFetcher,
  type PlatformItemInput,
  requireCredential,
} from './types'

const BLUESKY_SERVICE = 'https://bsky.social'
const PAGE_SIZE = 100

interface BlueskyAuthor {
  avatar?: string
  did: string
  displayName?: string
  handle: string
}

interface BlueskyPostView {
  author: BlueskyAuthor
  embed?: {
    external?: { thumb?: string; title?: string; uri?: string }
    images?: { thumb?: string }[]
  }
  record?: { createdAt?: string; text?: string }
  uri: string
}

export interface BlueskyBookmarkView {
  createdAt?: string
  item?: BlueskyPostView & { $type?: string }
  subject: { cid?: string; uri: string }
}

/** at://did:plc:xxx/app.bsky.feed.post/rkey → https://bsky.app/profile/{handle}/post/{rkey} */
export const blueskyPostUrl = (
  uri: string,
  authorHandle?: string,
): string | null => {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/)

  if (!match) {
    return null
  }

  const [, did, rkey] = match
  return `https://bsky.app/profile/${authorHandle || did}/post/${rkey}`
}

export const mapBlueskyBookmark = (
  bookmark: BlueskyBookmarkView,
): PlatformItemInput => {
  const post = bookmark.item
  const author = post?.author
  const text = post?.record?.text?.trim() ?? ''
  const firstLine = text.split('\n')[0]?.trim() ?? ''
  const title = firstLine
    ? firstLine.length > 100
      ? `${firstLine.slice(0, 100)}…`
      : firstLine
    : author
      ? `Post by @${author.handle}`
      : 'Bluesky post'
  const image =
    post?.embed?.images?.[0]?.thumb ?? post?.embed?.external?.thumb ?? null

  return {
    createdAt: bookmark.createdAt ? new Date(bookmark.createdAt) : undefined,
    description: text || null,
    externalId: bookmark.subject.uri,
    image,
    metadata: author
      ? {
          author: {
            avatar: author.avatar ?? null,
            displayName: author.displayName ?? null,
            handle: author.handle,
          },
        }
      : null,
    title,
    url: blueskyPostUrl(bookmark.subject.uri, author?.handle),
  }
}

const createSession = async (identifier: string, password: string) => {
  const response = await fetch(
    `${BLUESKY_SERVICE}/xrpc/com.atproto.server.createSession`,
    {
      body: JSON.stringify({ identifier, password }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  )

  if (!response.ok) {
    throw new Error(`Bluesky sign-in failed (${response.status})`)
  }

  return (await response.json()) as { accessJwt: string; did: string }
}

export const fetchBlueskyBookmarks: PlatformFetcher = async ({
  credentials,
  limit = DEFAULT_SYNC_LIMIT,
}) => {
  const handle = requireCredential(credentials, 'handle', 'Bluesky')
  const appPassword = requireCredential(credentials, 'appPassword', 'Bluesky')
  const session = await createSession(handle, appPassword)
  const items: PlatformItemInput[] = []
  let cursor: string | undefined

  while (items.length < limit) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })

    if (cursor) {
      params.set('cursor', cursor)
    }

    const response = await fetch(
      `${BLUESKY_SERVICE}/xrpc/app.bsky.bookmark.getBookmarks?${params}`,
      { headers: { Authorization: `Bearer ${session.accessJwt}` } },
    )

    if (!response.ok) {
      throw new Error(`Bluesky bookmarks request failed (${response.status})`)
    }

    const body = (await response.json()) as {
      bookmarks?: BlueskyBookmarkView[]
      cursor?: string
    }
    const bookmarks = body.bookmarks ?? []

    items.push(...bookmarks.map(mapBlueskyBookmark))

    if (!body.cursor || bookmarks.length === 0) {
      break
    }

    cursor = body.cursor
  }

  return items.slice(0, limit)
}
