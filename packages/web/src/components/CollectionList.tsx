import { FolderIcon } from '@phosphor-icons/react'
import { CONTENT } from '../constants'
import type { CollectionType, MetaTag } from '../utils/fetching/meta'
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
  tags?: MetaTag[]
}
export const CollectionList = ({ collections, tags }: TypeListProps) => (
  <Collapsible stateKey="collections">
    <CollapsibleTrigger asChild>
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

                let count = bookmark_count || 0
                // also count up tags that match the collection name
                const matchingTags = tags?.filter((item) => {
                  return item.tag?.toLowerCase() === collection.toLowerCase()
                })
                for (const tag of matchingTags!) {
                  if (tag?.count) {
                    count += tag.count
                  }
                }
                return {
                  collection,
                  count,
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
                    href={`/collection/${item.collection}`}
                    activePath={`/collection/${item.collection}`}
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
