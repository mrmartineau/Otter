import { FolderIcon } from '@phosphor-icons/react'
import { CONTENT } from '../constants'
import type { CollectionType } from '../utils/fetching/meta'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible'
import { Flex } from './Flex'
import { SidebarLink } from './SidebarLink'
import { Text } from './Text'

interface TypeListProps {
  collections?: CollectionType[]
}
export const CollectionList = ({ collections }: TypeListProps) => (
  <Collapsible stateKey="collections">
    <CollapsibleTrigger>
      {CONTENT.collectionsNav}{' '}
      <Text variant="count">{collections?.length}</Text>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Flex gapY="3xs" direction="column">
        {collections?.length
          ? collections
              .map(({ bookmark_count, collection }) => {
                if (!collection) {
                  return null
                }

                // bookmark_count already includes bookmarks tagged with the
                // bare collection name — don't add tag counts on top.
                return {
                  collection,
                  count: bookmark_count || 0,
                }
              })
              .sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
              .map((item) => {
                if (!item) {
                  return null
                }
                return (
                  <SidebarLink
                    count={item.count}
                    href={`/collection/${encodeURIComponent(item.collection)}`}
                    activePath={`/collection/${encodeURIComponent(item.collection)}`}
                    key={item.collection}
                  >
                    <FolderIcon
                      size={18}
                      weight="duotone"
                      aria-label={item.collection}
                    />
                    {item.collection}
                  </SidebarLink>
                )
              })
          : null}
      </Flex>
    </CollapsibleContent>
  </Collapsible>
)
