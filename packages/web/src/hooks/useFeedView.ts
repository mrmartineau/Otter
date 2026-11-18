import { useLocalStorage } from 'usehooks-ts'

export const FEED_VIEWS = ['list', 'compact', 'cards'] as const
export type FeedView = (typeof FEED_VIEWS)[number]

// Per device on purpose: a phone may want cards while a desktop wants compact.
export const useFeedView = () => {
  const [view, setView] = useLocalStorage<FeedView>('otter-feed-view', 'list')
  return [FEED_VIEWS.includes(view) ? view : 'list', setView] as const
}
