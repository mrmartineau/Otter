/**
 * The form of a URL that /api/check-url compares: no scheme, `www.`, query,
 * fragment or trailing slash, lowercased. Mirrors the `url_key` generated
 * column on `bookmarks` (db/schema.ts) — change both together.
 */
export const urlKey = (url: string) =>
  url
    // Drop the query and fragment: everything from the first `?` or `#`.
    // `[\s\S]` (not `.`) so a newline can't stop it — Postgres `.` matches newlines.
    .replace(/[?#][\s\S]*$/, '')
    // Drop a leading scheme (`https://`), then a leading `www.`, and any
    // trailing slashes. `g` so both ends go; `i` so `HTTPS://WWW.` matches too.
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)?(www\.)?|\/+$/gi, '')
    .toLowerCase()
