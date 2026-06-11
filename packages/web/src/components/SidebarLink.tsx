import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSidebar } from '../hooks/useSidebar'
import { Link, type LinkProps } from './Link'
import { Text } from './Text'

type SidebarLinkProps = LinkProps & {
  count?: number
  activePath?: string
  children: ReactNode
}

// A link is active when the location matches every search param the link
// declares. Only the link's own keys are checked, so links with no `search`
// (e.g. "All feeds", or routes that carry incidental URL state like filters)
// stay active on a plain pathname match, while each `?folder=` link only
// activates for its own folder value.
const searchMatches = (
  current: Record<string, unknown> | undefined,
  target: Record<string, unknown> | undefined,
): boolean => {
  if (!target) {
    return true
  }
  for (const key of Object.keys(target)) {
    if (current?.[key] !== target[key]) {
      return false
    }
  }
  return true
}
export const SidebarLink = ({
  count,
  href,
  children,
  activePath,
  ...rest
}: SidebarLinkProps) => {
  const location = useLocation()
  // Links can share a pathname and differ only by search params (e.g. feed
  // folders all point at /feeds and vary by `?folder=`), so the active state
  // must compare both the pathname and the search params.
  const search = (rest as { search?: Record<string, unknown> }).search
  const isActive = activePath
    ? location.pathname.includes(activePath)
    : location.pathname === href &&
      searchMatches(location.search as Record<string, unknown>, search)

  const { handleCloseSidebar } = useSidebar()

  return (
    <Link
      to={href}
      variant="sidebar"
      {...rest}
      isActive={isActive}
      onClick={handleCloseSidebar}
    >
      <div className="link-sidebar-inner">{children}</div>
      {count ? <Text variant="count">{count}</Text> : null}
    </Link>
  )
}
