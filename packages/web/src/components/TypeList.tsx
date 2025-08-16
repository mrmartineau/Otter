import title from 'title'
import { CONTENT } from '../constants'
import type { BookmarkType } from '../types/db'
import type { MetaType } from '../utils/fetching/meta'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible'
import { Flex } from './Flex'
import { SidebarLink } from './SidebarLink'
import { TypeToIcon } from './TypeToIcon'

interface TypeListProps {
  types?: MetaType[]
}
export const TypeList = ({ types }: TypeListProps) => (
  <Collapsible stateKey="types">
    <CollapsibleTrigger asChild>{CONTENT.typesNav}</CollapsibleTrigger>
    <CollapsibleContent>
      <Flex gapY="3xs" direction="column">
        {types?.length
          ? types.map(({ type, count }) => {
              if (!type) {
                return null
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
              )
            })
          : 'No types'}
      </Flex>
    </CollapsibleContent>
  </Collapsible>
)
