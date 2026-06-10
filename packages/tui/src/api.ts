import type { OtterConfig } from './config.ts'

/** Mirrors the web worker's BaseBookmark row shape. */
export interface Bookmark {
  click_count: number
  created_at: string
  description: string | null
  id: string
  image: string | null
  modified_at: string
  note: string | null
  public: boolean
  star: boolean
  status: 'active' | 'inactive'
  tags: string[] | null
  title: string | null
  type: string | null
  url: string | null
}

export interface TagCount {
  count: number
  tag: string
}

export interface ListResponse<T> {
  count: number
  data: T[]
  limit: number
  offset: number
}

export interface Profile {
  id: string
  username: string | null
}

export interface ListParams {
  limit?: number
  offset?: number
  star?: boolean
  tag?: string
  type?: string
}

type Query = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  body?: unknown
  method?: string
  query?: Query
}

/**
 * Thin client for the Otter worker API, authenticating with the profile
 * API key as a Bearer token (see worker/context.ts).
 */
export class OtterClient {
  apiKey: string
  baseUrl: string

  constructor(config: OtterConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`)

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    let response: Response

    try {
      response = await fetch(url, {
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        headers,
        method: options.method ?? 'GET',
      })
    } catch (error) {
      throw new Error(
        `Could not reach ${url.host} (${error instanceof Error ? error.message : String(error)})`,
      )
    }

    const text = await response.text()
    let parsed: unknown = null

    try {
      parsed = JSON.parse(text)
    } catch {
      // non-JSON error body — handled below
    }

    if (!response.ok) {
      const body = (parsed ?? {}) as { error?: string; reason?: string }
      throw new Error(
        body.reason || body.error || `HTTP ${response.status} from ${path}`,
      )
    }

    return parsed as T
  }

  me() {
    return this.request<Profile>('/me')
  }

  listBookmarks(params: ListParams) {
    return this.request<ListResponse<Bookmark>>('/bookmarks', {
      query: { ...params },
    })
  }

  searchBookmarks(searchTerm: string, params: ListParams) {
    return this.request<ListResponse<Bookmark>>('/search', {
      query: {
        limit: params.limit,
        offset: params.offset,
        q: searchTerm,
        star: params.star,
        tag: params.tag,
        type: params.type,
      },
    })
  }

  tags() {
    return this.request<TagCount[]>('/tags')
  }

  /** Adds a bookmark; the worker scrapes title/description/type from the URL. */
  addBookmark(url: string, tags: string[] = []) {
    return this.request<Bookmark[]>('/new', {
      body: [{ scrape: true, tags, url }],
      method: 'POST',
    })
  }

  updateBookmark(id: string, patch: Partial<Bookmark>) {
    return this.request<Bookmark>(`/bookmarks/${id}`, {
      body: patch,
      method: 'PATCH',
    })
  }

  deleteBookmark(id: string) {
    return this.request<unknown>(`/bookmarks/${id}`, { method: 'DELETE' })
  }

  registerClick(id: string) {
    return this.request<unknown>(`/bookmarks/${id}/click`, { method: 'POST' })
  }
}
