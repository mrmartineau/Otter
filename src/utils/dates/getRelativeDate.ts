import memoizeOne from 'memoize-one';
import relativeDate from 'tiny-relative-date';

import { daysAgo } from './daysAgo';

export const getRelativeDateSource = (
  date: string,
): {
  formatted: string;
  ago: number;
  relative: string;
} => {
  const originalDate = new Date(date);
  const formatDate = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  });
  const formatted = formatDate.format(originalDate);
  const ago = daysAgo(originalDate);
  const relative: string = relativeDate(originalDate);
  return {
    formatted,
    ago,
    relative,
  };
};

export const getRelativeDate = memoizeOne(getRelativeDateSource);
