'use client';

import {
  CONTENT,
  REPO_URL,
  ROUTE_DASHBOARD,
  ROUTE_FEED,
  ROUTE_HOME,
  ROUTE_SETTINGS_ACCOUNT,
  ROUTE_STARS,
  ROUTE_STATS,
  ROUTE_TOOTS_MINE,
  ROUTE_TRASH,
  ROUTE_TWEETS_MINE,
} from '@/src/constants';
import {
  ArrowFatLinesUp,
  Gauge,
  ListBullets,
  RocketLaunch,
  Star,
  Trash,
  TwitterLogo,
  UserCircle,
} from '@phosphor-icons/react';
import { useRef } from 'react';
import { useClickAway } from 'use-click-away';

import { useSidebar } from '../hooks/useSidebar';
import { DbMetaResponse } from '../utils/fetching/meta';
import { Flex } from './Flex';
import { Link } from './Link';
import LogoutButton from './LogoutButton';
import { MastodonLogo } from './MastodonLogo';
import './Sidebar.css';
import { SidebarLink } from './SidebarLink';
import { AllTags } from './TagList';
import { TypeList } from './TypeList';

interface SidebarProps {
  serverDbMeta: DbMetaResponse;
  version?: string;
}

export const Sidebar = ({ serverDbMeta, version }: SidebarProps) => {
  const { handleCloseSidebar } = useSidebar();
  const dbMeta = serverDbMeta;

  const sidebarRef = useRef(null);
  useClickAway(sidebarRef, (event: Event) => {
    const navButton = document.querySelector('[data-testid="navButton"]');
    if (event.target !== navButton) {
      handleCloseSidebar();
    }
  });

  return (
    <div className="otter-sidebar-pane" ref={sidebarRef}>
      <div>
        <div className="sidebar-top">
          <Link href={ROUTE_HOME} variant="logo">
            <img src="/otter-logo.svg" width="33" height="33" />
            <div>Otter</div>
          </Link>
        </div>
        <Flex gapY="3xs" direction="column">
          <SidebarLink href={ROUTE_DASHBOARD}>
            <Gauge aria-label="Dashboard" size={18} weight="duotone" />
            {CONTENT.dashboardNav}
          </SidebarLink>
          <SidebarLink href={ROUTE_FEED} count={dbMeta.all}>
            <ListBullets aria-label="All" size={18} weight="duotone" />
            {CONTENT.feedNav}
          </SidebarLink>
          {dbMeta.stars > 0 ? (
            <SidebarLink href={ROUTE_STARS} count={dbMeta.stars}>
              <Star aria-label="Stars" size={18} weight="duotone" />
              {CONTENT.starsNav}
            </SidebarLink>
          ) : null}
          {dbMeta.top > 0 ? (
            <SidebarLink href={ROUTE_STATS} count={dbMeta.top}>
              <ArrowFatLinesUp aria-label="Top" size={18} weight="duotone" />
              {CONTENT.topLinksNav}
            </SidebarLink>
          ) : null}
          {dbMeta.toots > 0 || dbMeta.likedToots > 0 ? (
            <SidebarLink href={ROUTE_TOOTS_MINE} activePath="toots">
              <MastodonLogo size={18} />
              {CONTENT.tootsNav}
            </SidebarLink>
          ) : null}
          {dbMeta.tweets > 0 || dbMeta.likedTweets > 0 ? (
            <SidebarLink href={ROUTE_TWEETS_MINE} activePath="tweets">
              <TwitterLogo size={18} weight="duotone" />
              {CONTENT.tweetsNav}
            </SidebarLink>
          ) : null}
          <TypeList types={dbMeta.types} />
          <AllTags tags={dbMeta.tags} />
        </Flex>
      </div>

      <Flex gapY="3xs" direction="column" className="mt-s">
        <SidebarLink href={ROUTE_TRASH} count={dbMeta.trash}>
          <Trash aria-label="Trash" size={18} weight="duotone" />
          {CONTENT.trashNav}
        </SidebarLink>
        <SidebarLink href={ROUTE_SETTINGS_ACCOUNT} activePath="settings">
          <UserCircle aria-label="Settings" size={18} weight="duotone" />
          {CONTENT.settingsNav}
        </SidebarLink>
        <LogoutButton />
        <SidebarLink href={`${REPO_URL}/releases/tag/v${version}`}>
          <RocketLaunch aria-label="Trash" size={18} weight="duotone" />
          Otter {version}
        </SidebarLink>
      </Flex>
    </div>
  );
};
