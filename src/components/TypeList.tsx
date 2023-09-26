import { Button } from '@/components/ui/button';
import { CaretUpDown } from '@phosphor-icons/react';
import title from 'title';

import { CONTENT } from '../constants';
import { BookmarkType } from '../types/db';
import { MetaType } from '../utils/fetching/meta';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible';
import { Flex } from './Flex';
import { SidebarLink } from './SidebarLink';
import { TypeToIcon } from './TypeToIcon';

// import { caretDown } from '../../icons';

interface TypeListProps {
  types?: MetaType[];
}
export const TypeList = ({ types }: TypeListProps) => (
  <Collapsible stateKey="types">
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="justify-between w-full">
        <div>{CONTENT.typesNav}</div>
        <CaretUpDown weight="duotone" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Flex gapY="3xs" direction="column">
        {types?.length
          ? types.map(({ type, count }) => {
              if (!type) {
                return null;
              }
              return (
                <SidebarLink
                  count={count || 0}
                  href={`/type/${type}`}
                  activePath={`/type/${type}`}
                  key={type}
                >
                  <TypeToIcon
                    type={type as BookmarkType}
                    color="var(--theme9)"
                    width="18"
                    aria-label={type}
                  />
                  {title(type)}
                </SidebarLink>
              );
            })
          : 'No types'}
      </Flex>
    </CollapsibleContent>
  </Collapsible>
);
