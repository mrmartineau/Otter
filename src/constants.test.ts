import { describe, expect, it } from 'vitest';

import { CONTENT, createTitle } from './constants';

describe('createTitle', () => {
  it('should return the app name when no pageName is provided', () => {
    expect(createTitle()).toEqual(CONTENT.appName);
  });
  it(`should return the correct title when a valid 'pageName' is provided`, () => {
    expect(createTitle('feedTitle')).toEqual('Feed — Otter');
    expect(createTitle('searchTitle')).toEqual('Search — Otter');
    expect(createTitle('starsTitle')).toEqual('Stars — Otter');
    expect(createTitle('topLinksTitle')).toEqual('Top links — Otter');
    expect(createTitle(CONTENT.topLinksTitle)).toEqual('Top links — Otter');
  });
  it(`should return the given value if it does not exist in the 'CONTENT' dictionary`, () => {
    expect(createTitle('Zander')).toEqual('Zander — Otter');
    expect(createTitle(CONTENT.topLinksTitle)).toEqual('Top links — Otter');
  });
});
