import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from '@raycast/api'
import urlJoin from 'proper-url-join'
import { useState } from 'react'
import { Authenticated } from './components/Authenticated'
import { LinkItem } from './components/LinkItem'
import { NoItems } from './components/NoItems'
import { RecentTop } from './components/RecentTop'
import { TagDropdown } from './components/TagDropdown'
import { DEFAULT_TAG } from './constants'
import { useMeta } from './useMeta'
import { useRecents } from './useRecents'
import { useSearch } from './useSearch'

const prefs = getPreferenceValues()

const SearchBookmarks = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTag, setActiveTag] = useState<string>(DEFAULT_TAG)
  const { data: recentBookmarks, isLoading: recentIsLoading } =
    useRecents(activeTag)
  const { data: searchResults, isLoading } = useSearch(searchTerm, activeTag)
  const { data: metadata } = useMeta()
  const bookmarksLoading = recentIsLoading || isLoading

  const handleReset = () => {
    setSearchTerm('')
    setActiveTag(DEFAULT_TAG)
  }

  return (
    <List
      isLoading={bookmarksLoading}
      searchText={searchTerm}
      searchBarPlaceholder={`Search Otter, like "wordle"…`}
      onSearchTextChange={setSearchTerm}
      throttle
      isShowingDetail={prefs.showDetailView}
      searchBarAccessory={
        <TagDropdown tags={metadata?.tags} onChange={setActiveTag} />
      }
    >
      {searchTerm ? (
        <>
          {searchResults?.length ? (
            <>
              <List.Item
                title={`Open search in Otter`}
                icon={Icon.MagnifyingGlass}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={urlJoin(prefs.otterBasePath, 'search', {
                        query: { q: searchTerm },
                      })}
                      title="Open Search in Otter"
                    />
                  </ActionPanel>
                }
              />
              {searchResults.map((item) => {
                return <LinkItem key={`search-${item.id}`} {...item} />
              })}
            </>
          ) : (
            <NoItems onReset={handleReset} />
          )}
        </>
      ) : (
        <>
          {recentBookmarks?.length ? (
            <>
              <RecentTop activeTag={activeTag} />
              {recentBookmarks.map((item) => {
                return <LinkItem key={`recent-${item.id}`} {...item} />
              })}
            </>
          ) : (
            <NoItems onReset={handleReset} />
          )}
        </>
      )}
    </List>
  )
}

export default function SearchCommand() {
  return (
    <Authenticated>
      <SearchBookmarks />
    </Authenticated>
  )
}
