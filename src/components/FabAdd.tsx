'use client';

import { PlusCircle } from '@phosphor-icons/react';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';

import { ROUTE_NEW_BOOKMARK } from '../constants';
import { Link } from './Link';

export const FabAdd = () => {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  const hideFab =
    pathname === `/new/bookmark` || segments[segments.length - 1] === 'edit';

  if (hideFab) {
    return null;
  }

  return (
    <Link href={ROUTE_NEW_BOOKMARK} variant="fab" aria-label="Add new bookmark">
      <PlusCircle size="30" weight="duotone" color="currentColor" />
    </Link>
  );
};
