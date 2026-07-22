import { parseAsBoolean, parseAsInteger, useQueryState } from 'nuqs'

export function useFeedOptions() {
  const [starQuery, setStarQuery] = useQueryState(
    'star',
    parseAsBoolean.withDefault(false),
  )
  const [publicQuery, setPublicQuery] = useQueryState(
    'public',
    parseAsBoolean.withDefault(false),
  )
  // 7-day date window: 0 = off, 1 = last 7 days, 2 = 8–14 days ago, etc.
  const [windowQuery, setWindowQuery] = useQueryState(
    'window',
    parseAsInteger.withDefault(0),
  )

  return {
    publicQuery,
    setPublicQuery,
    setStarQuery,
    setWindowQuery,
    starQuery,
    windowQuery,
  }
}
