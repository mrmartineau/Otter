import { HashIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getCollectionsTagsOptions } from '@/utils/fetching/collections'
import { getTagsOptions } from '@/utils/fetching/tags'

export const useCollectionsSubNav = (collection: string) => {
  const { data: dbMetaTags } = useQuery(getTagsOptions())
  const { data: collectionTags } = useQuery(getCollectionsTagsOptions())

  const subNav = useMemo(() => {
    const matchingCollection =
      collectionTags?.filter((item) => {
        return item?.collection?.toLowerCase() === collection.toLowerCase()
      }) || []
    const matchingMetaTag = dbMetaTags?.find((item) => {
      return item?.tag?.toLowerCase() === collection.toLowerCase()
    })
    const matchingCollectionTags = matchingCollection[0]?.tags || []
    const matchingTags = [matchingMetaTag?.tag, ...matchingCollectionTags]

    return matchingTags?.length
      ? matchingTags
          ?.filter((item) => typeof item === 'string')
          .map((item) => {
            return {
              href: `/tag/${encodeURIComponent(item)}`,
              icon: <HashIcon weight="duotone" size={18} />,
              isActive: false,
              text: item,
            }
          })
      : []
  }, [collection, collectionTags, dbMetaTags])

  return subNav
}
