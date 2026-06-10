import { describe, expect, it } from 'vitest'
import { type GithubStarView, mapGithubStar } from './github'

describe('mapGithubStar', () => {
  const star: GithubStarView = {
    repo: {
      description: 'A self-hosted bookmark manager',
      full_name: 'mrmartineau/Otter',
      html_url: 'https://github.com/mrmartineau/Otter',
      id: 12345,
      language: 'TypeScript',
      owner: { avatar_url: 'https://avatars.githubusercontent.com/u/1' },
      stargazers_count: 420,
    },
    starred_at: '2026-06-01T10:00:00Z',
  }

  it('maps a starred repo to a platform item', () => {
    const item = mapGithubStar(star)

    expect(item.externalId).toBe('12345')
    expect(item.title).toBe('mrmartineau/Otter')
    expect(item.description).toBe('A self-hosted bookmark manager')
    expect(item.url).toBe('https://github.com/mrmartineau/Otter')
    expect(item.image).toBe('https://avatars.githubusercontent.com/u/1')
    expect(item.createdAt).toEqual(new Date('2026-06-01T10:00:00Z'))
    expect(item.metadata).toEqual({ language: 'TypeScript', stars: 420 })
  })

  it('handles missing optional fields', () => {
    const item = mapGithubStar({
      repo: {
        full_name: 'someone/repo',
        html_url: 'https://github.com/someone/repo',
        id: 99,
      },
    })

    expect(item.createdAt).toBeUndefined()
    expect(item.description).toBe(null)
    expect(item.image).toBe(null)
    expect(item.metadata).toEqual({ language: null, stars: null })
  })
})
