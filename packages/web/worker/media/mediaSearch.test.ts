import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGoogleBooksSearch, getOpenLibrarySearch } from './mediaSearch'

const mockFetchJson = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(body),
    ok,
    status,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getGoogleBooksSearch', () => {
  it('maps volumes to media search items with https covers', async () => {
    const fetchMock = mockFetchJson({
      items: [
        {
          id: 'abc123',
          volumeInfo: {
            authors: ['Frank Herbert'],
            imageLinks: {
              smallThumbnail: 'http://books.google.com/small.jpg',
              thumbnail: 'http://books.google.com/thumb.jpg',
            },
            title: 'Dune',
          },
        },
        {
          id: 'no-title',
          volumeInfo: {},
        },
        {
          id: 'no-image',
          volumeInfo: { title: 'Coverless' },
        },
      ],
    })

    const results = await getGoogleBooksSearch('dune', 'test-key')

    const requestUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      'https://www.googleapis.com/books/v1/volumes',
    )
    expect(requestUrl.searchParams.get('q')).toBe('dune')
    expect(requestUrl.searchParams.get('key')).toBe('test-key')

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      id: 'abc123',
      image: 'https://books.google.com/thumb.jpg',
      maker: 'Frank Herbert',
      title: 'Dune',
      type: 'book',
    })
    expect(results[1].image).toContain('placehold.co')
  })

  it('throws on a non-ok response so the caller can fall back', async () => {
    mockFetchJson({}, false, 429)

    await expect(getGoogleBooksSearch('dune', 'test-key')).rejects.toThrow(
      '429',
    )
  })
})

describe('getOpenLibrarySearch', () => {
  it('prefers edition covers and uses the work key as id', async () => {
    mockFetchJson({
      docs: [
        {
          author_name: ['Frank Herbert'],
          cover_i: 111,
          editions: { docs: [{ cover_i: 222 }] },
          key: '/works/OL45883W',
          title: 'Dune',
        },
        {
          key: '/works/OL1W',
          title: 'Coverless',
        },
      ],
    })

    const results = await getOpenLibrarySearch('dune')

    expect(results[0]).toEqual({
      id: '/works/OL45883W',
      image: 'https://covers.openlibrary.org/b/id/222-M.jpg',
      maker: 'Frank Herbert',
      title: 'Dune',
      type: 'book',
    })
    expect(results[1].image).toContain('placehold.co')
  })
})
