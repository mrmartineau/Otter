import { useMemo } from 'react';

import { useUpdateUISettings } from '../../hooks';
import { Bookmark } from '../../types/bookmark';
import { Tweet } from '../../types/tweet';

export type FeedItemModel = Tweet | Bookmark;
export const groupItemsByDate = (items: FeedItemModel[]) => {
  const groupedItems = items.reduce<Record<string, FeedItemModel[]>>(
    (acc, item) => {
      const date = new Date(item.created_at);
      const dateString = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      if (!acc[dateString]) {
        acc[dateString] = [];
      }
      acc[dateString].push(item);
      return acc;
    },
    {},
  );
  const groupedItemsArray = Object.entries(groupedItems).map(
    ([date, items]) => ({
      date,
      items,
    }),
  );

  return groupedItemsArray;
};

export const useGroupByDate = (items: FeedItemModel[]) => {
  // const [settings, handleUpdateUISettings] = useUpdateUISettings();
  const handleSetGroupByDate = (newState: boolean) => {
    console.log(`🚀 ~ handleSetGroupByDate ~ handleSetGroupByDate:`, newState);
    // if (settings.uiState.groupByDate !== newState) {
    //   handleUpdateUISettings({ type: 'groupByDate' });
    // }
  };
  const groupByDate = true; //settings.uiState.groupByDate;
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  return { handleSetGroupByDate, groupByDate, groupedItems };
};
