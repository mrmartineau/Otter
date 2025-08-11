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
export const SidebarLink = ({
  count,
  href,
  children,
  activePath,
  ...rest
}: SidebarLinkProps) => {
  const location = useLocation()
  const isActive =
    location.pathname === href ||
    (activePath ? location.pathname.includes(activePath) : false)

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
