import {
  getSearchBookmarks,
  getSearchToots,
  getSearchTweets,
} from '@/utils/fetching/search'

export const fetchSearch = async (searchTerm: string) => {
  const [bookmarksSearch, tweetsSearch, tootsSearch] = await Promise.all([
    getSearchBookmarks({
      params: { limit: 5, order: 'desc', status: 'active' },
      searchTerm,
    }),
    getSearchTweets({
      params: { limit: 5, order: 'desc' },
      searchTerm,
    }),
    getSearchToots({
      params: { limit: 5, order: 'desc' },
      searchTerm,
    }),
  ])

  return {
    bookmarksSearch: bookmarksSearch.data,
    tootsSearch: tootsSearch.data,
    tweetsSearch: tweetsSearch.data,
  }
}
