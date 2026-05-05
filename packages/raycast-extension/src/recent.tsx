import { getPreferenceValues, List } from '@raycast/api'
import { useState } from 'react'
import { Authenticated } from './components/Authenticated'
import { LinkItem } from './components/LinkItem'
import { NoItems } from './components/NoItems'
import { RecentTop } from './components/RecentTop'
import { TagDropdown } from './components/TagDropdown'
import { DEFAULT_TAG } from './constants'
import { useMeta } from './useMeta'
import { useRecents } from './useRecents'

const prefs = getPreferenceValues()

export const RecentBookmarks = () => {
  const [activeTag, setActiveTag] = useState<string>(DEFAULT_TAG)
  const { data: recentBookmarks, isLoading } = useRecents(activeTag)
  const { data: metadata } = useMeta()

  const handleReset = () => {
    setActiveTag(DEFAULT_TAG)
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter…"
      isShowingDetail={prefs.showDetailView}
      searchBarAccessory={
        <TagDropdown tags={metadata?.tags} onChange={setActiveTag} />
      }
    >
      <RecentTop activeTag={activeTag} />
      {recentBookmarks?.length ? (
        recentBookmarks.map((item) => {
          return <LinkItem key={`recent-${item.id}`} {...item} />
        })
      ) : (
        <NoItems onReset={handleReset} />
      )}
    </List>
  )
}

export default function Command() {
  return (
    <Authenticated>
      <RecentBookmarks />
    </Authenticated>
  )
}
