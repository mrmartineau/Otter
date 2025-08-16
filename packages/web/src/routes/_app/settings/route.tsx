import {
  GearIcon,
  HashIcon,
  PlugsIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Flex } from '@/components/Flex'
import { headingVariants } from '@/components/Heading'
import { SidebarLink } from '@/components/SidebarLink'
import { CONTENT } from '@/constants'

export const Route = createFileRoute('/_app/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <h3 className={headingVariants({ variant: 'feedTitle' })}>
        <Flex align="center" gap="xs">
          <GearIcon weight="duotone" size={24} />
          {CONTENT.accountSettingsTitle}
        </Flex>
      </h3>

      <Flex align="center" gapX="2xs" className="my-s">
        {/* <NextLink href="/settings/app" passHref>
      <SidebarLink>
        <GearIcon />
        App settings
      </SidebarLink>
    </NextLink> */}
        <SidebarLink href="/settings/account">
          <UserCircleIcon weight="duotone" size={18} />
          Account
        </SidebarLink>
        <SidebarLink href="/settings/integrations">
          <PlugsIcon weight="duotone" size={18} />
          Integrations
        </SidebarLink>
        <SidebarLink href="/settings/tags">
          <HashIcon weight="duotone" size={18} />
          Manage tags
        </SidebarLink>
      </Flex>

      <Outlet />
    </>
  )
}
