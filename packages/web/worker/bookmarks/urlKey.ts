/**
 * The form of a URL that /api/check-url compares: no scheme, `www.`, query,
 * fragment or trailing slash, lowercased. Mirrors the `url_key` generated
 * column on `bookmarks` (db/schema.ts) — change both together.
 */
export const urlKey = (url: string) =>
  url
    .replace(/[?#][\s\S]*$/, '')
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)?(www\.)?|\/+$/gi, '')
    .toLowerCase()
