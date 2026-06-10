import { describe, expect, it } from 'vitest'
import {
  type BlueskyBookmarkView,
  blueskyPostUrl,
  mapBlueskyBookmark,
} from './bluesky'

describe('blueskyPostUrl', () => {
  it('converts an at:// uri to a bsky.app url using the handle', () => {
    expect(
      blueskyPostUrl(
        'at://did:plc:abc123/app.bsky.feed.post/3kxyz',
        'zander.bsky.social',
      ),
    ).toBe('https://bsky.app/profile/zander.bsky.social/post/3kxyz')
  })

  it('falls back to the did when no handle is available', () => {
    expect(blueskyPostUrl('at://did:plc:abc123/app.bsky.feed.post/3kxyz')).toBe(
      'https://bsky.app/profile/did:plc:abc123/post/3kxyz',
    )
  })

  it('returns null for non-post uris', () => {
    expect(blueskyPostUrl('at://did:plc:abc123/app.bsky.feed.like/3kxyz')).toBe(
      null,
    )
  })
})

describe('mapBlueskyBookmark', () => {
  const post = {
    author: {
      avatar: 'https://cdn.bsky.app/avatar.jpg',
      did: 'did:plc:abc123',
      displayName: 'Zander',
      handle: 'zander.bsky.social',
    },
    record: {
      createdAt: '2026-05-30T09:00:00.000Z',
      text: 'First line of the post\nSecond line',
    },
    uri: 'at://did:plc:abc123/app.bsky.feed.post/3kxyz',
  }
  const bookmark: BlueskyBookmarkView = {
    createdAt: '2026-06-01T10:00:00.000Z',
    item: post,
    subject: { uri: 'at://did:plc:abc123/app.bsky.feed.post/3kxyz' },
  }

  it('maps a bookmarked post to a platform item', () => {
    const item = mapBlueskyBookmark(bookmark)

    expect(item.externalId).toBe('at://did:plc:abc123/app.bsky.feed.post/3kxyz')
    expect(item.title).toBe('First line of the post')
    expect(item.description).toBe('First line of the post\nSecond line')
    expect(item.url).toBe(
      'https://bsky.app/profile/zander.bsky.social/post/3kxyz',
    )
    expect(item.createdAt).toEqual(new Date('2026-06-01T10:00:00.000Z'))
    expect(item.metadata).toEqual({
      author: {
        avatar: 'https://cdn.bsky.app/avatar.jpg',
        displayName: 'Zander',
        handle: 'zander.bsky.social',
      },
    })
  })

  it('truncates long first lines for the title', () => {
    const longText = 'a'.repeat(150)
    const item = mapBlueskyBookmark({
      ...bookmark,
      item: {
        ...post,
        record: { text: longText },
      },
    })

    expect(item.title).toBe(`${'a'.repeat(100)}…`)
    expect(item.description).toBe(longText)
  })

  it('falls back to an author-based title when the post has no text', () => {
    const item = mapBlueskyBookmark({
      ...bookmark,
      item: { ...post, record: { text: '' } },
    })

    expect(item.title).toBe('Post by @zander.bsky.social')
    expect(item.description).toBe(null)
  })
})
