import { TAG_FOR_AUTO_TOOT } from '@/src/constants';
import { pascalCase } from 'change-case';

/**
 * @name filteredTags
 * @description Filters and transforms a given array of tags
 * @param {string[]} tags - Array of tags to filter and transform
 * @returns {string} - Transformed tags, joined with a space
 * @example filteredTags(['react','CSS', 'TwitterLike', 'OtterBot', 'instapaper']) // returns '#React #CSS'
 */
export const filteredTags = (tags: string[]) => {
  return tags
    .filter((item) => {
      if (
        [
          TAG_FOR_AUTO_TOOT,
          'IFTTT',
          'TwitterLike',
          'OtterBot',
          'instapaper',
        ].includes(item)
      ) {
        return false;
      }
      return true;
    })
    .map((item) =>
      // if the tag is uppercase, return it as is, otherwise convert it to PascalCase
      item.toUpperCase() === item ? `#${item}` : `#${pascalCase(item)}`,
    )
    .join(' ');
};

/**
 * @name similarArrays
 * @description Checks if two arrays contain the same values
 * @param {string[]} xs - The first array
 * @param {string[]} ys - The second array
 * @returns {boolean} - true if both arrays contain the same values
 * @example similarArrays([1, 2], [2, 1]) // true
 */
export const similarArrays = (xs: any[], ys: any[]) => {
  const xsu = [...new Set(xs).values()]; // unique values of xs
  const ysu = [...new Set(ys).values()]; // unique values of ys
  return xsu.length != ysu.length ? false : xsu.every((x) => ysu.includes(x));
};
