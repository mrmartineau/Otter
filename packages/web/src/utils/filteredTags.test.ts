import { describe, expect, it } from 'vitest';

import { filteredTags } from './filteredTags';

describe('filteredTags', () => {
  it('should return a string of transformed tags joined with a space', () => {
    expect(
      filteredTags(['react', 'CSS', 'TwitterLike', 'OtterBot', 'instapaper']),
    ).toEqual('#React #CSS');
    expect(filteredTags(['REACT', 'CsS'])).toEqual('#REACT #CsS');
  });
});
