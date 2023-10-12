import matchWords from 'match-words';
import memoizeOne from 'memoize-one';

import { MetadataResponse } from '../types/api';
import { MetaTag } from './fetching/meta';

export interface MatchTagsProps extends Partial<MetadataResponse> {
  note?: string;
}

export const matchTagsSource = (data: MatchTagsProps, tags?: MetaTag[]) => {
  const titleWords = data?.title ? matchWords(data.title) : [];
  const descWords = data?.description ? matchWords(data.description) : [];
  const noteWords = data?.note ? matchWords(data.note) : [];
  const allWords = [
    ...(titleWords || []),
    ...(descWords || []),
    ...(noteWords || []),
  ];
  const possibleTags =
    tags?.reduce<string[]>((acc, item): string[] => {
      const found = allWords.find((word) => {
        return word.toLowerCase() === item.tag?.toLowerCase();
      });
      if (found) {
        acc.push(item.tag as string);
      }
      return acc;
    }, []) ?? [];

  return possibleTags;
};

export const matchTags = memoizeOne(matchTagsSource);
