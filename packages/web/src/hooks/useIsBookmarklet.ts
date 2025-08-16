import { useSearch } from '@tanstack/react-router'

export const useIsBookmarklet = (): boolean => {
  const searchParams = useSearch({ strict: false })
  // @ts-expect-error How do I type search params?
  const bookmarklet = searchParams?.bookmarklet
  return bookmarklet === 'true'
}
