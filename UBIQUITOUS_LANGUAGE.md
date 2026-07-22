# Ubiquitous Language

> Seeded from the `packages/web` schema (`db/schema.ts`, `src/types/db.ts`) and worker domain code. Opinionated — refine to match how the team actually speaks.

## Saving (bookmarks)

| Term            | Definition                                                                                  | Aliases to avoid          |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------- |
| **Bookmark**    | A saved URL or resource owned by a user, the core unit of Otter                             | Link, item, entry, save   |
| **Bookmark type** | What kind of thing a bookmark is — `link`, `video`, `article`, `recipe`, `book`, etc.     | Category, kind            |
| **Bookmark status** | Whether a bookmark is `active` (visible) or `inactive` (soft-hidden)                     | State, archived           |
| **Star**        | A boolean favourite flag on a bookmark                                                       | Like, favourite, pin      |
| **Note**        | The user's own free-text annotation on a bookmark                                           | Comment, description      |
| **Description** | Scraped or summarised text describing the bookmarked page (not user-authored)               | Note, excerpt, summary    |
| **Click count** | How many times a bookmark has been opened                                                    | Hits, views               |
| **Public**      | A bookmark visibility flag that exposes it in the cross-user public feed                     | Shared, published         |

## Labelling (tags & collections)

| Term           | Definition                                                                                            | Aliases to avoid    |
| -------------- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| **Tag**        | A free-form text label attached to a bookmark                                                        | Label, keyword      |
| **Collection** | A first-class named grouping of bookmarks, currently implemented via the prefix of a namespaced tag `name:rest` (`ai:openai` → collection `ai`) | Folder, group, category |
| **Pinned tag** | A tag a user has promoted in their profile settings for quick access                                 | Favourite tag       |

## Tracking (media)

| Term             | Definition                                                                                  | Aliases to avoid     |
| ---------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| **Media**        | A tracked piece of content the user consumes — `tv`, `film`, `game`, `book`, `podcast`, `music`, `other` | Title, content, item |
| **Media type**   | The category of a media item (the list above)                                               | Kind, format         |
| **Media status** | Where the item sits in the consumption lifecycle — `wishlist` → `now` → `done` (or `skipped`) | State, progress      |
| **Rating**       | A 0–5 score in 0.5 steps assigned to a media item                                           | Score, stars         |
| **Platform**     | Where a media item is consumed (e.g. streaming service, console)                            | Source, provider     |

## Logging (journals & checklists)

| Term              | Definition                                                                                      | Aliases to avoid       |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------------- |
| **Journal**       | A named log owned by a user that groups journal entries                                         | Diary, log, list       |
| **Journal entry** | A dated record inside a journal; may reference media and carry a status                         | Post, log line, note   |
| **Journal status**| Lifecycle of a journal or entry — `active`, `inactive`, `archived`, `deleted`, `draft`          | State                  |
| **Checklist**     | A named list owned by a user                                                                     | Todo list, tasklist    |
| **Checklist entry** | A counted item on a checklist, tied to a journal entry                                         | Task, item, todo       |

## Importing (social & feeds)

| Term     | Definition                                                                              | Aliases to avoid   |
| -------- | --------------------------------------------------------------------------------------- | ------------------ |
| **Tweet**| A Twitter/X post imported or liked by the user and stored in Otter                      | Post, status       |
| **Toot** | A Mastodon post imported or liked by the user and stored in Otter                       | Post, status       |
| **Feed** | A configured RSS or API source (the `feeds` table) that supplies bookmarks              | Source, channel    |
| **Scrape / Extract** | Fetching a page and pulling out its title, description, image and content        | Crawl, parse       |

## People & access

| Term              | Definition                                                                                   | Aliases to avoid          |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------- |
| **User**          | An authentication identity (the `better-auth` `user` record)                                 | Account, member, person   |
| **Profile**       | A user's app-level settings, username, avatar and API key (1:1 with user)                    | Account, settings, user   |
| **Account**       | A `better-auth` credential/external-provider link for a user — NOT the domain "account"       | Profile, user             |
| **Session**       | An authenticated browser session for a user                                                  | Login                     |
| **API key**       | A profile-scoped UUID used by clients (TUI, scripts) to authenticate                         | Token, secret             |
| **OAuth client**  | A registered third-party app (Raycast, MCP clients) authorised against Otter's OAuth provider | App, integration          |
| **Consent**       | A user's recorded authorisation of an OAuth client's scopes                                   | Grant, approval           |

## Sharing & integrations

| Term                 | Definition                                                                            | Aliases to avoid    |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------- |
| **Share**            | A tokenised public link exposing a tag's or collection's bookmarks                    | Link, publish       |
| **Share kind**       | What a share exposes — `tag` or `collection`                                          | Type                |
| **User integration** | A user's outbound connection config, currently Bluesky cross-posting                  | Connection, plugin  |

## Clients & distribution

| Term                | Definition                                                                                          | Aliases to avoid        |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| **Client**          | Any app that consumes the Otter API — the TUI, web extension, Raycast extension, native app          | Integration, frontend   |
| **TUI**             | The terminal client (`packages/tui`); installs the `otter` command, with `otter-tui` as an alias      | CLI, terminal app       |
| **Tap**             | The Homebrew repository (`mrmartineau/homebrew-tap`) that distributes the TUI                        | Repo, registry          |
| **Formula**         | The Homebrew install recipe for the TUI (`otter-tui`), living in the tap                             | Package, recipe         |
| **Release tarball** | The prebuilt TUI archive attached to a GitHub release; what the formula downloads and installs        | Bundle, artifact, build |

## Relationships

- A **User** has exactly one **Profile** and may have many **Accounts** (auth links).
- A **Bookmark** belongs to one **User** and carries many **Tags**.
- A **Collection** is a first-class grouping that owns many **Bookmarks**; today it is realised through the `name:` prefix of **Tags** rather than its own table — a bookmark tagged `name:rest` or bare `name` belongs to collection `name`.
- A **Journal** owns many **Journal entries**; a **Journal entry** may own many **Checklist entries**.
- A **Checklist entry** links one **Checklist** to one **Journal entry**.
- A **Share** belongs to one **User** and points at one **Tag** or **Collection** (its **share kind**).
- A **Feed** supplies **Bookmarks**; the `feed` text field on a **Bookmark** names its origin.

## Example dialogue

> **Dev:** "When a **User** stars a **Bookmark**, does that make it **public**?"

> **Domain expert:** "No — **Star** is private. **Public** is separate: it's the flag that puts a **Bookmark** in the cross-user feed. A user can star something and keep it private."

> **Dev:** "And **Collections** — those are just a kind of **Tag**?"

> **Domain expert:** "No — a **Collection** is its own thing, a first-class grouping of bookmarks. Right now we *implement* it through namespaced **Tags**: tag a bookmark `ai:openai` and it rolls up into the `ai` **Collection**, bare `ai` counts too. But talk about it as a collection, not a tag trick — the tag prefix is just how it's stored today."

> **Dev:** "If a user wants to publish their `ai` collection, that's a **Share**?"

> **Domain expert:** "Right — a **Share** with **share kind** `collection` and name `ai`. There's also kind `tag` for a single tag. Either way it's a tokenised public link."

> **Dev:** "Last one — `media` keeps confusing me. The journal entry has a `media` field too."

> **Domain expert:** "Yeah, that's a naming collision. **Media** the entity is the tracked TV/film/game item with a status and rating. The `media` array on a **Journal entry** is just references, and the `media` JSON on a **Tweet** is attachments. Only the first is the domain concept — the others should be read as 'attachments' or 'media refs'."

## Flagged ambiguities

- **"Collection" is a first-class concept with no backing table.** The domain treats a **Collection** as its own entity (a named grouping you create and share), but the schema has no `collections` table — it is derived at read time from the `name:` prefix of **Tags** (`worker/collections.ts`). This model/implementation gap means a collection can't yet hold metadata, an explicit owner, ordering, or members that aren't expressed as tags. If collections are truly first-class, consider promoting them to a real table; until then, keep the language ("create a collection", "a bookmark belongs to a collection") and treat the tag-prefix as an implementation detail.
- **"Feed" has three meanings.** (1) The `feeds` table = an RSS/API import source; (2) the `feed` text column on a **Bookmark** = a label for where it came from; (3) the "public feed" = `getRecentPublicBookmarks`, a cross-user stream. Recommend: reserve **Feed** for the import source, say **public feed** for the stream, and rename the bookmark column meaning to **source** in conversation.
- **"Status" is overloaded across three lifecycles.** Bookmark status (`active`/`inactive`), media status (`wishlist`/`now`/`done`/`skipped`), and journal status (`active`/`inactive`/`archived`/`deleted`/`draft`) are unrelated state machines that share a column name. Always qualify: **bookmark status**, **media status**, **journal status**.
- **"Type" is overloaded.** Bookmark type, media type, feed type, and share kind are four separate enums. Note that sharing uses **kind** while the others use **type** — keep that split deliberate, or unify on one word.
- **"Media" names both an entity and unrelated fields.** The **Media** entity (tracked content) collides with the `media` array on journal entries (references) and `media` JSON on tweets/toots (attachments). Reserve **Media** for the tracked entity.
- **"Account" is not the domain account.** `account` is a `better-auth` credential/provider link, not a user-facing account. The user-facing concept is **Profile**. Avoid saying "account" for "the user's stuff".
- **"Star" vs "liked".** Bookmarks have **star**; imported tweets/toots have `liked_tweet`/`liked_toot`. Both are favourite-ish but distinct — keep **Star** for bookmarks, **liked** for social imports.
- **"Otter" names the product, the repo, and now a command.** The Homebrew-installed TUI binary is `otter` (with `otter-tui` as an alias), while the formula and package keep the `otter-tui` name. In conversation, say **Otter** for the product/service and **the TUI** (or `otter` command) for the terminal client.
- **Note vs description vs entry vs excerpt.** **Note** = user-authored on a bookmark; **description** = scraped/summarised; **entry** = a journal entry's body; `excerpt` appears in form types but not the schema. Don't use them interchangeably.
