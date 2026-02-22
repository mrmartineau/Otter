import { useSearch } from '@tanstack/react-router'

export const useIsBookmarklet = (): boolean => {
  const searchParams = useSearch({ strict: false })
  const bookmarklet = searchParams?.bookmarklet

  if (typeof bookmarklet === 'boolean') {
    return bookmarklet
  }

  if (typeof bookmarklet === 'string') {
    return bookmarklet.toLowerCase() === 'true'
  }

  return false
}
