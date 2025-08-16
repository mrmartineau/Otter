import { pascalCase } from 'change-case'

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
        ['public', 'IFTTT', 'TwitterLike', 'OtterBot', 'instapaper'].includes(
          item,
        )
      ) {
        return false
      }
      return true
    })
    .map((item) =>
      // if the tag is uppercase, return it as is, otherwise convert it to PascalCase
      item.toUpperCase() === item ? `#${item}` : `#${pascalCase(item)}`,
    )
    .join(' ')
}
