# Otter

Self-hosted bookmark manager and media tracker. One domain shared by the web app/API (`packages/web`) and its clients (browser extensions, Raycast, TUI, native apps).

## Language

### Identity

**User**:
An authenticated identity (the `better-auth` account). Owns everything in the system.
_Avoid_: account, member

**Profile**:
The app-level layer on a User: username, API key, and UI settings. Every User has exactly one Profile.
_Avoid_: user settings, account profile

### Bookmarks

**Bookmark**:
A saved item — usually a URL, but also notes, files, and places. Has a Type, optional Tags, a star flag, and a public flag.
_Avoid_: link, item, entry

**Type**:
The kind of content a Bookmark holds (link, article, video, recipe, note, place, …). One per Bookmark, defaults to `link`.
_Avoid_: category, format

**Tag**:
A free-text label on a Bookmark. Stored directly on the Bookmark; a Bookmark can have many.
_Avoid_: label, keyword, hashtag (reserved for Toots/Tweets)

**Collection**:
A grouping derived from namespaced Tags: the Tag `dev:css` puts a Bookmark in the Collection `dev`. Collections are not stored — they exist wherever a `prefix:suffix` Tag exists. A bare Tag equal to the prefix (`dev` alone) is not part of the Collection.
_Avoid_: folder, group, namespace

**Star**:
A per-Bookmark favourite flag.
_Avoid_: favourite, like (reserved for imported Toots/Tweets)

**Public Bookmark**:
A Bookmark flagged visible to everyone; appears in the cross-user public feed.
_Avoid_: shared bookmark (see Share)

**Trash**:
Where inactive Bookmarks live. A trashed Bookmark has status `inactive`; it is recoverable, not deleted.
_Avoid_: archive, deleted

### Sharing

**Share**:
A tokenized public link exposing one user's Bookmarks filtered by a single Tag or a single Collection. Identified by its token; one Share per (user, kind, name).
_Avoid_: public link, share link

### Media tracking

**Media**:
A tracked piece of media (TV, film, game, book, podcast, music) with a Status and an optional Rating. Distinct from Bookmarks.
_Avoid_: media item, watchlist item

**Status (Media)**:
Where a Media sits in its lifecycle: `wishlist` (want it), `now` (in progress), `done` (finished), `skipped` (abandoned).

**Rating**:
A 0–5 half-step score on a finished (or any) Media.
_Avoid_: score, stars

### Journals

**Journal**:
A named log owned by a User, holding Journal Entries.

**Journal Entry**:
A dated free-text entry in a Journal; can reference Media.

### Imports & integrations

**Toot**:
A Mastodon post imported into Otter (typically a like). Keeps its origin metadata (author, hashtags, attachments).

**Tweet**:
A Twitter/X post imported into Otter. Same shape as a Toot.

**Feed**:
A configured external source (RSS or API) that Otter reads from. A Bookmark's `feed` field records which Feed it came from.
_Avoid_: using "feed" for the public Bookmark stream — call that the public feed explicitly

**Integration**:
A per-user connection to an external service (currently Bluesky) used to cross-post Bookmarks.
_Avoid_: connection, linked account
