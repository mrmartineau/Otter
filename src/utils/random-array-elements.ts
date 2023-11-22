/**
 * Returns an array of a specified length containing a random subset of elements from a given array.
 * The maximum allowed length is equal to the length of the original array.
 */
export const randomElements = <T>(array: T[], length: number): T[] => {
  const subsetArray = [];
  array = array.slice();

  const desiredLength = Math.min(length, array.length);

  let wordCount = 0;
  for (let i = 0; wordCount < desiredLength; i++) {
    const index = Math.round(Math.random() * (array.length - 1));
    const item = array[index];
    subsetArray.push(item);
    array.splice(index, 1);
    wordCount++;
  }
  return subsetArray;
};
