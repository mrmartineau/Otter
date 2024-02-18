import type { Collection } from '../types/db';

export const findMatchingCollections = (
  collections?: Collection[] | null,
  searchTags?: string[] | null,
): Collection[] => {
  if (!collections || !searchTags) {
    return [];
  }

  return collections.filter((collection) => {
    if (!collection.tags) {
      return false;
    }
    return collection?.tags.some((tag) => searchTags.includes(tag));
  });
};
