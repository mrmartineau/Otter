'use client';

import { Button } from '@/src/components/Button';
import { List } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ROUTE_FEED_HOME } from '../constants';
import { useSidebar } from '../hooks/useSidebar';
import { DbMetaResponse } from '../utils/fetching/meta';
import { CmdK } from './CmdK';
import { Flex } from './Flex';
import { Link } from './Link';
import './TopBar.css';

interface TopBarProps extends ComponentPropsWithoutRef<'header'> {
  children?: ReactNode;
  serverDbMeta: DbMetaResponse;
}

export const TopBar = ({
  className,
  children,
  serverDbMeta,
  ...rest
}: TopBarProps) => {
  const topbarClass = clsx(className, 'otter-top-bar');
  const { handleToggleSidebar } = useSidebar();

  return (
    <header className={topbarClass} {...rest}>
      <Flex align="center" gap="2xs" className="top-bar-buttons">
        <Button
          variant="icon"
          size="s"
          aria-label="View navigation"
          data-testid="navButton"
          onClick={handleToggleSidebar}
        >
          <List weight="duotone" size={30} />
        </Button>

        <Link href={ROUTE_FEED_HOME} variant="logo">
          <span className="emoji">🦦</span>
          <span>Otter</span>
        </Link>
      </Flex>
      <CmdK serverDbMeta={serverDbMeta} />
    </header>
  );
};
