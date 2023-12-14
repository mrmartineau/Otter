import { Cards } from '@phosphor-icons/react';

import { CONTENT } from '../constants';
import { CollectionType } from '../utils/fetching/meta';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible';
import { Flex } from './Flex';
import { SidebarLink } from './SidebarLink';
import { Text } from './Text';

interface TypeListProps {
  collections?: CollectionType[];
}
export const CollectionList = ({ collections }: TypeListProps) => (
  <Collapsible stateKey="collections">
    <CollapsibleTrigger asChild>
      {CONTENT.collectionsNav}{' '}
      <Text variant="count">{collections?.length}</Text>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Flex gapY="3xs" direction="column">
        {collections?.length
          ? collections.map(({ tags, bookmark_count, collection }) => {
              if (!collection) {
                return null;
              }
              return (
                <SidebarLink
                  count={bookmark_count || 0}
                  href={`/collection/${collection}`}
                  activePath={`/collection/${collection}`}
                  key={collection}
                >
                  <Cards size={18} weight="duotone" aria-label={collection} />
                  {collection}
                </SidebarLink>
              );
            })
          : 'No types'}
      </Flex>
    </CollapsibleContent>
  </Collapsible>
);
