'use client';

import { usePathname } from 'next/navigation';

import { Flex } from './Flex';
import { Link, LinkProps } from './Link';
import { Text } from './Text';

type SidebarLinkProps = LinkProps & {
  count?: number;
  activePath?: string;
};
export const SidebarLink = ({
  count,
  href,
  children,
  activePath,
  ...rest
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const sanitizedPath = pathname.split('#')[0].split('?')[0];
  const isActive = pathname === href || sanitizedPath === activePath;

  return (
    <Link href={href} variant="sidebar" {...rest} isActive={isActive}>
      <Flex display="inline" gapX="s" align="center">
        {children}
      </Flex>
      {count ? <Text variant="count">{count}</Text> : null}
    </Link>
  );
};
