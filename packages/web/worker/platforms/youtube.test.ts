import { describe, expect, it } from 'vitest'
import { mapYoutubeVideo, type YoutubeVideoView } from './youtube'

describe('mapYoutubeVideo', () => {
  const video: YoutubeVideoView = {
    id: 'dQw4w9WgXcQ',
    snippet: {
      channelTitle: 'A Channel',
      description: 'A video description',
      publishedAt: '2026-06-01T10:00:00Z',
      thumbnails: {
        default: { url: 'https://i.ytimg.com/default.jpg' },
        medium: { url: 'https://i.ytimg.com/medium.jpg' },
      },
      title: 'A liked video',
    },
  }

  it('maps a liked video to a platform item', () => {
    const item = mapYoutubeVideo(video)

    expect(item.externalId).toBe('dQw4w9WgXcQ')
    expect(item.title).toBe('A liked video')
    expect(item.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(item.image).toBe('https://i.ytimg.com/medium.jpg')
    expect(item.createdAt).toEqual(new Date('2026-06-01T10:00:00Z'))
    expect(item.metadata).toEqual({ channelTitle: 'A Channel' })
  })

  it('truncates very long descriptions', () => {
    const item = mapYoutubeVideo({
      ...video,
      snippet: { ...video.snippet, description: 'x'.repeat(600) },
    })

    expect(item.description).toBe(`${'x'.repeat(500)}…`)
  })

  it('falls back across thumbnail sizes', () => {
    const item = mapYoutubeVideo({
      ...video,
      snippet: {
        ...video.snippet,
        thumbnails: { default: { url: 'https://i.ytimg.com/default.jpg' } },
      },
    })

    expect(item.image).toBe('https://i.ytimg.com/default.jpg')
  })
})
