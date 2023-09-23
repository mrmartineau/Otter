'use client';

import { PlusCircle } from '@phosphor-icons/react';

import { ROUTE_NEW_BOOKMARK } from '../constants';
import { Link } from './Link';

export const FabAdd = () => {
  return (
    <Link href={ROUTE_NEW_BOOKMARK} variant="fab" aria-label="Add new bookmark">
      <PlusCircle size="30" weight="duotone" color="currentColor" />
    </Link>
  );
};
