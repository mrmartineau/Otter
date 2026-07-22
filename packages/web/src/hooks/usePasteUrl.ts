import { useMatchRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

function isUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * @name usePasteUrl
 * @description Listens for paste events and navigates to the new bookmark page
 * when a valid URL is pasted outside of input fields.
 */
export function usePasteUrl() {
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const isNewBookmarkRoute = Boolean(
    matchRoute({ fuzzy: true, to: '/new/bookmark' }),
  )

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (isNewBookmarkRoute) return

      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const text = event.clipboardData?.getData('text/plain')?.trim()
      if (text && isUrl(text)) {
        event.preventDefault()
        navigate({
          search: { url: text },
          to: '/new/bookmark',
        })
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [navigate, isNewBookmarkRoute])
}
