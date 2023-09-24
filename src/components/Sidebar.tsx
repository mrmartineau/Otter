'use client';

import {
  CONTENT,
  ROUTE_FEED_HOME,
  ROUTE_SETTINGS_ACCOUNT,
  ROUTE_SIGNOUT,
  ROUTE_STARS,
  ROUTE_STATS,
  ROUTE_TRASH,
  ROUTE_TWEETS_LIKES,
  ROUTE_TWEETS_MINE,
} from '@/src/constants';
// import { AllTags, Flex, Link, SidebarIcon, SidebarLink, TypeList } from '..';
import {
  ArrowFatLinesUp,
  Gear,
  ListBullets,
  SignOut,
  Star,
  Trash,
  TwitterLogo,
} from '@phosphor-icons/react';

import { DbMetaResponse } from '../utils/fetching/meta';
import { Flex } from './Flex';
import { Link } from './Link';
import './Sidebar.styles.css';
import { SidebarLink } from './SidebarLink';

interface SidebarProps {
  dbMeta: DbMetaResponse;
}

export const Sidebar = ({ dbMeta }: SidebarProps) => {
  console.log(`🚀 ~ Sidebar ~ dbMeta:`, dbMeta);
  return (
    <>
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
          {/* <TypeList types={dbMeta?.types} />
          <AllTags tags={dbMeta?.tags} /> */}
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
        <SidebarLink href={ROUTE_SIGNOUT}>
          <SignOut aria-label="Sign out" size={18} weight="duotone" />
          {CONTENT.signOutNav}
        </SidebarLink>
      </Flex>
    </>
  );
};
