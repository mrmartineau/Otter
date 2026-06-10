import {
  DEFAULT_SYNC_LIMIT,
  type PlatformFetcher,
  type PlatformItemInput,
  requireCredential,
} from './types'

const PAGE_SIZE = 100

export interface GithubStarView {
  repo: {
    description?: string | null
    full_name: string
    html_url: string
    id: number
    language?: string | null
    owner?: { avatar_url?: string }
    stargazers_count?: number
  }
  starred_at?: string
}

export const mapGithubStar = (star: GithubStarView): PlatformItemInput => ({
  createdAt: star.starred_at ? new Date(star.starred_at) : undefined,
  description: star.repo.description ?? null,
  externalId: String(star.repo.id),
  image: star.repo.owner?.avatar_url ?? null,
  metadata: {
    language: star.repo.language ?? null,
    stars: star.repo.stargazers_count ?? null,
  },
  title: star.repo.full_name,
  url: star.repo.html_url,
})

export const fetchGithubStars: PlatformFetcher = async ({
  credentials,
  limit = DEFAULT_SYNC_LIMIT,
}) => {
  const token = requireCredential(credentials, 'token', 'GitHub')
  const items: PlatformItemInput[] = []
  let page = 1

  while (items.length < limit) {
    const response = await fetch(
      `https://api.github.com/user/starred?per_page=${PAGE_SIZE}&page=${page}`,
      {
        headers: {
          // The star+json media type includes starred_at timestamps
          Accept: 'application/vnd.github.star+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'otter-bookmark-manager',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!response.ok) {
      throw new Error(
        `GitHub starred repos request failed (${response.status})`,
      )
    }

    const stars = (await response.json()) as GithubStarView[]

    items.push(...stars.map(mapGithubStar))

    if (stars.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return items.slice(0, limit)
}
