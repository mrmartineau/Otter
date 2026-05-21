import {
  ChartLineUpIcon,
  ShieldStarIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { SidebarLink } from '@/components/SidebarLink'
import {
  CONTENT,
  ROUTE_ADMIN,
  ROUTE_ADMIN_USERS,
  ROUTE_DASHBOARD,
} from '@/constants'
import { getUserProfile } from '@/utils/fetching/user'

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: async () => {
    let profile: Awaited<ReturnType<typeof getUserProfile>>

    try {
      profile = await getUserProfile()
    } catch {
      throw redirect({ to: ROUTE_DASHBOARD })
    }

    if (profile.data?.role !== 'admin') {
      throw redirect({ to: ROUTE_DASHBOARD })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <h3 className={headingVariants({ variant: 'feedTitle' })}>
        <Flex align="center" gap="xs">
          <ShieldStarIcon weight="duotone" size={24} />
          {CONTENT.adminTitle}
        </Flex>
      </h3>

      <Flex align="center" gapX="2xs" className="my-s">
        <SidebarLink href={ROUTE_ADMIN}>
          <ChartLineUpIcon weight="duotone" size={18} />
          Overview
        </SidebarLink>
        <SidebarLink href={ROUTE_ADMIN_USERS}>
          <UsersIcon weight="duotone" size={18} />
          {CONTENT.adminUsersTitle}
        </SidebarLink>
      </Flex>

      <Outlet />
    </>
  )
}
