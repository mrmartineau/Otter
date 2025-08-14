import {
  ApertureIcon,
  ArrowFatLinesUpIcon,
  EyeIcon,
  GaugeIcon,
  ListBulletsIcon,
  RocketLaunchIcon,
  StarIcon,
  TrashIcon,
  TwitterLogoIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useRef } from 'react'
import { useClickAway } from 'use-click-away'
import {
  CONTENT,
  REPO_URL,
  ROUTE_DASHBOARD,
  ROUTE_FEED,
  ROUTE_HOME,
  ROUTE_MEDIA,
  ROUTE_PUBLIC,
  ROUTE_SETTINGS_ACCOUNT,
  ROUTE_STARS,
  ROUTE_STATS,
  ROUTE_TOOTS_MINE,
  ROUTE_TRASH,
  ROUTE_TWEETS_MINE,
} from '@/constants'
import { getMetaOptions } from '@/utils/fetching/meta'
import { useSidebar } from '../hooks/useSidebar'
import { CollectionList } from './CollectionList'
import { Flex } from './Flex'
import { Link } from './Link'
import LogoutButton from './LogoutButton'
import { MastodonLogo } from './MastodonLogo'
import { SidebarLink } from './SidebarLink'
import { Spinner } from './Spinner'
import { AllTags } from './TagList'
import { TypeList } from './TypeList'

interface SidebarProps {
  version?: string
}

export const Sidebar = ({ version }: SidebarProps) => {
  const { handleCloseSidebar } = useSidebar()
  const { data: dbMeta } = useQuery(getMetaOptions())
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  const sidebarRef = useRef(null)
  useClickAway(sidebarRef, (event: Event) => {
    const navButton = document.querySelector('[data-testid="navButton"]')
    if (event.target !== navButton) {
      handleCloseSidebar()
    }
  })

  return (
    <div className="otter-sidebar-pane" ref={sidebarRef}>
      <div>
        <div className="sidebar-top">
          <Link href={ROUTE_HOME} variant="logo">
            <img
              src="/otter-logo.svg"
              width="33"
              height="33"
              alt="Otter logo"
            />
            <div>Otter</div>
          </Link>
          <Spinner show={isLoading} />
        </div>
        <Flex gapY="3xs" direction="column">
          <SidebarLink href={ROUTE_DASHBOARD}>
            <GaugeIcon aria-label="Dashboard" size={18} weight="duotone" />
            {CONTENT.dashboardNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_FEED} count={dbMeta?.all}>
            <ListBulletsIcon aria-label="All" size={18} weight="duotone" />
            {CONTENT.feedNav}
          </SidebarLink>
          <SidebarLink
            href={ROUTE_PUBLIC}
            // @ts-expect-error How do I type search params?
            search={{ public: true }}
            count={dbMeta?.public}
          >
            <EyeIcon aria-label="Public" size={18} weight="fill" />
            {CONTENT.publicNav}
          </SidebarLink>
          <SidebarLink
            href={ROUTE_STARS}
            // @ts-expect-error How do I type search params?
            search={{ star: true }}
            count={dbMeta?.stars}
          >
            <StarIcon aria-label="Stars" size={18} weight="duotone" />
            {CONTENT.starsNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_STATS} count={dbMeta?.top}>
            <ArrowFatLinesUpIcon aria-label="Top" size={18} weight="duotone" />
            {CONTENT.topLinksNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_TOOTS_MINE} activePath="toots">
            <MastodonLogo size={18} />
            {CONTENT.tootsNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_TWEETS_MINE} activePath="tweets">
            <TwitterLogoIcon size={18} weight="duotone" />
            {CONTENT.tweetsNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_MEDIA} activePath="media">
            <ApertureIcon size={18} weight="duotone" />
            {CONTENT.mediaNav}
          </SidebarLink>
          <TypeList types={dbMeta?.types} />
          <AllTags tags={dbMeta?.tags} />
          <CollectionList
            collections={dbMeta?.collections}
            tags={dbMeta?.tags}
          />
        </Flex>
      </div>

      <Flex gapY="3xs" direction="column" className="mt-s">
        <SidebarLink href={ROUTE_TRASH} count={dbMeta?.trash}>
          <TrashIcon aria-label="Trash" size={18} weight="duotone" />
          {CONTENT.trashNav}
        </SidebarLink>
        <SidebarLink href={ROUTE_SETTINGS_ACCOUNT} activePath="settings">
          <UserCircleIcon aria-label="Settings" size={18} weight="duotone" />
          {CONTENT.settingsNav}
        </SidebarLink>
        <LogoutButton />
        <SidebarLink href={`${REPO_URL}/releases/tag/v${version}`}>
          <RocketLaunchIcon aria-label="Trash" size={18} weight="duotone" />
          Otter {version}
        </SidebarLink>
      </Flex>
    </div>
  )
}
