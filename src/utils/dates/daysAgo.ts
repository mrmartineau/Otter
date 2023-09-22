import memoizeOne from 'memoize-one';

// calculate days between now and a date
export const daysAgoSource = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
};
export const daysAgo = memoizeOne(daysAgoSource);
