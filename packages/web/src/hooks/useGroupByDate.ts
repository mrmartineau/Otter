import { useMemo } from 'react'

import { useUser } from '../components/UserProvider'
import type { Bookmark, Toot, Tweet } from '../types/db'

export type FeedItemModel = Tweet | Bookmark | Toot
export const groupItemsByDate = (items: FeedItemModel[] = []) => {
  const groupedItems = items.reduce<Record<string, FeedItemModel[]>>(
    (acc, item) => {
      const date = new Date(item.created_at as string | number | Date)
      const dateString = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      if (!acc[dateString]) {
        acc[dateString] = []
      }
      acc[dateString].push(item)
      return acc
    },
    {},
  )
  const groupedItemsArray = Object.entries(groupedItems).map(
    ([date, items]) => ({
      date,
      items,
    }),
  )

  return groupedItemsArray
}

export const useGroupByDate = (items: FeedItemModel[]) => {
  const { profile } = useUser()

  const groupByDate = profile?.settings_group_by_date
  const groupedItems = useMemo(() => groupItemsByDate(items), [items])

  return { groupByDate, groupedItems }
}
