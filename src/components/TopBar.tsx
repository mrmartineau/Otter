'use client';

import { cn } from '@/src/utils/classnames';
import { List } from '@phosphor-icons/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ComponentPropsWithoutRef, ReactNode, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ROUTE_HOME } from '../constants';
import { useSidebar } from '../hooks/useSidebar';
import { DbMetaResponse } from '../utils/fetching/meta';
import { CmdK } from './CmdK';
import { Flex } from './Flex';
import { IconButton } from './IconButton';
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
  const topbarClass = cn(className, 'otter-top-bar');
  const { handleToggleSidebar } = useSidebar();
  const [queryClient] = useState(new QueryClient());

  return (
    <header className={topbarClass} {...rest}>
      <Flex align="center" gap="2xs" className="top-bar-buttons">
        <IconButton
          aria-label="View navigation"
          data-testid="navButton"
          onClick={handleToggleSidebar}
        >
          <List weight="duotone" size={30} />
        </IconButton>

        <Link href={ROUTE_HOME} variant="logo">
          <img src="/otter-logo.svg" width="33" height="33" />
          <span>Otter</span>
        </Link>
      </Flex>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          <CmdK serverDbMeta={serverDbMeta} />
        </ErrorBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </header>
  );
};
