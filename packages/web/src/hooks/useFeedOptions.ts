import { parseAsBoolean, useQueryState } from 'nuqs'

export function useFeedOptions() {
  const [starQuery, setStarQuery] = useQueryState(
    'star',
    parseAsBoolean.withDefault(false),
  )
  const [publicQuery, setPublicQuery] = useQueryState(
    'public',
    parseAsBoolean.withDefault(false),
  )

  return {
    publicQuery,
    setPublicQuery,
    setStarQuery,
    starQuery,
  }
}
