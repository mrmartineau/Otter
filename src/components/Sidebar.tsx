'use client';

import {
  CONTENT,
  ROUTE_FEED_HOME,
  ROUTE_SETTINGS_ACCOUNT,
  ROUTE_STARS,
  ROUTE_STATS,
  ROUTE_TOOTS_LIKES,
  ROUTE_TOOTS_MINE,
  ROUTE_TRASH,
  ROUTE_TWEETS_LIKES,
  ROUTE_TWEETS_MINE,
} from '@/src/constants';
import {
  ArrowFatLinesUp,
  Gear,
  ListBullets,
  Star,
  Trash,
  TwitterLogo,
} from '@phosphor-icons/react';
import { useRef } from 'react';
import { useClickAway } from 'use-click-away';

import { useSidebar } from '../hooks/useSidebar';
// import { useUpdateUISettings } from '../hooks/useUpdateUISettings';
import { DbMetaResponse } from '../utils/fetching/meta';
import { Flex } from './Flex';
import { Link } from './Link';
import LogoutButton from './LogoutButton';
import { MastodonLogo } from './MastodonLogo';
import './Sidebar.styles.css';
import { SidebarLink } from './SidebarLink';
import { AllTags } from './TagList';
import { TypeList } from './TypeList';

interface SidebarProps {
  dbMeta: DbMetaResponse;
}

export const Sidebar = ({ dbMeta }: SidebarProps) => {
  const { handleCloseSidebar } = useSidebar();
  // const [settings, handleUpdateUISettings] = useUpdateUISettings();

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
          <Link href={ROUTE_FEED_HOME} variant="logo">
            🦦 <div>Otter</div>
          </Link>
        </div>
        <Flex gapY="3xs" direction="column">
          <SidebarLink href={ROUTE_FEED_HOME} count={dbMeta?.all}>
            <ListBullets aria-label="All" size={18} weight="duotone" />
            {CONTENT.feedNav}
          </SidebarLink>
          {dbMeta.stars > 0 ? (
            <SidebarLink href={ROUTE_STARS} count={dbMeta.stars}>
              <Star aria-label="Stars" size={18} weight="duotone" />
              {CONTENT.starsNav}
            </SidebarLink>
          ) : null}
          <SidebarLink href={ROUTE_STATS}>
            <ArrowFatLinesUp aria-label="Top" size={18} weight="duotone" />
            {CONTENT.topLinksNav}
          </SidebarLink>
          {dbMeta.toots > 0 ? (
            <SidebarLink href={ROUTE_TOOTS_LIKES} count={dbMeta.toots}>
              <MastodonLogo size={18} />
              {CONTENT.tootsLikeNav}
            </SidebarLink>
          ) : null}
          {dbMeta.likedToots > 0 ? (
            <SidebarLink href={ROUTE_TOOTS_MINE} count={dbMeta.likedToots}>
              <MastodonLogo size={18} />
              {CONTENT.tootsMineNav}
            </SidebarLink>
          ) : null}
          {dbMeta.tweets > 0 ? (
            <SidebarLink href={ROUTE_TWEETS_LIKES} count={dbMeta.tweets}>
              <TwitterLogo
                aria-label="Liked tweets"
                size={18}
                weight="duotone"
              />
              {CONTENT.tweetsLikeNav}
            </SidebarLink>
          ) : null}
          {dbMeta.likedTweets > 0 ? (
            <SidebarLink href={ROUTE_TWEETS_MINE} count={dbMeta.likedTweets}>
              <TwitterLogo aria-label="My tweets" size={18} weight="duotone" />
              {CONTENT.tweetsMineNav}
            </SidebarLink>
          ) : null}
          <TypeList types={dbMeta.types} />
          <AllTags
            tags={dbMeta.tags}
            // settings={settings}
            // handleUpdateUISettings={handleUpdateUISettings}
          />
        </Flex>
      </div>

      <Flex gapY="3xs" direction="column" className="mt-s">
        <SidebarLink href={ROUTE_TRASH} count={dbMeta?.trash}>
          <Trash aria-label="Trash" size={18} weight="duotone" />
          {CONTENT.trashNav}
        </SidebarLink>
        <SidebarLink href={ROUTE_SETTINGS_ACCOUNT} activePath="settings">
          <Gear aria-label="Settings" size={18} weight="duotone" />
          {CONTENT.settingsNav}
        </SidebarLink>
        <LogoutButton />
      </Flex>
    </div>
  );
};
