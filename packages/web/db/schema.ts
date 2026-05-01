import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  json,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const feedsTypeEnum = pgEnum('feeds_type', ['rss', 'api'])

export const mediaRatingEnum = pgEnum('media_rating', [
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
])

export const mediaStatusEnum = pgEnum('media_status', [
  'now',
  'skipped',
  'done',
  'wishlist',
])

export const mediaTypeEnum = pgEnum('media_type', [
  'tv',
  'film',
  'game',
  'book',
  'podcast',
  'music',
  'other',
])

export const bookmarkStatusEnum = pgEnum('status', ['active', 'inactive'])

export const bookmarkTypeEnum = pgEnum('type', [
  'link',
  'video',
  'audio',
  'recipe',
  'image',
  'document',
  'article',
  'game',
  'book',
  'event',
  'product',
  'note',
  'file',
  'place',
])

export const authUsers = pgTable(
  'user',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    id: uuid('id').primaryKey().defaultRandom(),
    image: text('image'),
    name: text('name').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('user_email_key').on(table.email)],
)

export const authSessions = pgTable(
  'session',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    ipAddress: text('ip_address'),
    token: text('token').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_key').on(table.token),
    index('session_user_id_idx').on(table.userId),
  ],
)

export const authAccounts = pgTable(
  'account',
  {
    accessToken: text('access_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    accountId: text('account_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    idToken: text('id_token'),
    password: text('password'),
    providerId: text('provider_id').notNull(),
    refreshToken: text('refresh_token'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const authVerifications = pgTable('verification', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  value: text('value').notNull(),
})

export const authJwks = pgTable('jwks', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
})

export const oauthClients = pgTable(
  'oauth_client',
  {
    clientId: text('client_id').notNull(),
    clientSecret: text('client_secret'),
    contacts: text('contacts').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    disabled: boolean('disabled').default(false),
    enableEndSession: boolean('enable_end_session'),
    grantTypes: text('grant_types').array(),
    icon: text('icon'),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    metadata: json('metadata'),
    name: text('name'),
    policy: text('policy'),
    postLogoutRedirectUris: text('post_logout_redirect_uris').array(),
    public: boolean('public'),
    redirectUris: text('redirect_uris').array().notNull(),
    referenceId: text('reference_id'),
    requirePKCE: boolean('require_pkce'),
    responseTypes: text('response_types').array(),
    scopes: text('scopes').array(),
    skipConsent: boolean('skip_consent'),
    softwareId: text('software_id'),
    softwareStatement: text('software_statement'),
    softwareVersion: text('software_version'),
    subjectType: text('subject_type'),
    tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
    tos: text('tos'),
    type: text('type'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    uri: text('uri'),
    userId: uuid('user_id').references(() => authUsers.id),
  },
  (table) => [
    uniqueIndex('oauth_client_client_id_key').on(table.clientId),
    index('oauth_client_user_id_idx').on(table.userId),
  ],
)

export const oauthRefreshTokens = pgTable(
  'oauth_refresh_token',
  {
    authTime: timestamp('auth_time', { withTimezone: true }),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.clientId),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    referenceId: text('reference_id'),
    revoked: timestamp('revoked', { withTimezone: true }),
    scopes: text('scopes').array().notNull(),
    sessionId: text('session_id').references(() => authSessions.id, {
      onDelete: 'set null',
    }),
    token: text('token').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
  },
  (table) => [
    index('oauth_refresh_token_client_id_idx').on(table.clientId),
    index('oauth_refresh_token_session_id_idx').on(table.sessionId),
    index('oauth_refresh_token_user_id_idx').on(table.userId),
  ],
)

export const oauthAccessTokens = pgTable(
  'oauth_access_token',
  {
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.clientId),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    referenceId: text('reference_id'),
    refreshId: text('refresh_id').references(() => oauthRefreshTokens.id),
    scopes: text('scopes').array().notNull(),
    sessionId: text('session_id').references(() => authSessions.id, {
      onDelete: 'set null',
    }),
    token: text('token').notNull(),
    userId: uuid('user_id').references(() => authUsers.id),
  },
  (table) => [
    uniqueIndex('oauth_access_token_token_key').on(table.token),
    index('oauth_access_token_client_id_idx').on(table.clientId),
    index('oauth_access_token_session_id_idx').on(table.sessionId),
    index('oauth_access_token_user_id_idx').on(table.userId),
  ],
)

export const oauthConsents = pgTable(
  'oauth_consent',
  {
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.clientId),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    referenceId: text('reference_id'),
    scopes: text('scopes').array().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    userId: uuid('user_id').references(() => authUsers.id),
  },
  (table) => [
    index('oauth_consent_client_id_idx').on(table.clientId),
    index('oauth_consent_user_id_idx').on(table.userId),
  ],
)

export const profiles = pgTable(
  'profiles',
  {
    apiKey: uuid('api_key').notNull().defaultRandom(),
    avatarUrl: text('avatar_url'),
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    settingsCollectionsVisible: boolean('settings_collections_visible')
      .notNull()
      .default(false),
    settingsGroupByDate: boolean('settings_group_by_date').default(false),
    settingsPinnedTags: text('settings_pinned_tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    settingsTagsVisible: boolean('settings_tags_visible')
      .notNull()
      .default(false),
    settingsTopTagsCount: numeric('settings_top_tags_count', {
      mode: 'number',
    }),
    settingsTypesVisible: boolean('settings_types_visible')
      .notNull()
      .default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    username: text('username'),
  },
  (table) => [
    check('username_length', sql`char_length(${table.username}) >= 3`),
    uniqueIndex('profiles_api_key_key').on(table.apiKey),
    uniqueIndex('profiles_username_key').on(table.username),
  ],
)

export const bookmarks = pgTable(
  'bookmarks',
  {
    blueskyPostUri: text('bluesky_post_uri'),
    clickCount: smallint('click_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`timezone('utc', now())`),
    description: text('description'),
    feed: text('feed'),
    id: uuid('id').primaryKey().defaultRandom(),
    image: text('image'),
    modifiedAt: timestamp('modified_at', { withTimezone: true })
      .notNull()
      .default(sql`timezone('utc', now())`),
    note: text('note'),
    public: boolean('public').notNull().default(false),
    star: boolean('star').notNull().default(false),
    status: bookmarkStatusEnum('status').notNull().default('active'),
    tags: text('tags').array(),
    title: text('title'),
    tweet: json('tweet'),
    type: bookmarkTypeEnum('type').default('link'),
    url: text('url'),
    user: uuid('user').references(() => authUsers.id),
  },
  (table) => [
    index('bookmarks_user_idx').on(table.user),
    index('bookmarks_status_idx').on(table.status),
  ],
)

export const feeds = pgTable('feeds', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity({
      name: 'Feeds_id_seq',
    }),
  name: text('name').notNull(),
  properties: json('properties'),
  type: feedsTypeEnum('type').notNull(),
  url: text('url').notNull(),
})

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tag: text('tag').notNull(),
  },
  (table) => [uniqueIndex('tags_tag_key').on(table.tag)],
)

export const bookmarkTags = pgTable(
  'bookmark_tags',
  {
    bookmarkId: uuid('bookmark_id')
      .notNull()
      .references(() => bookmarks.id),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    primaryKey({
      columns: [table.bookmarkId, table.tagId],
      name: 'bookmark_tags_pkey',
    }),
  ],
)

export const media = pgTable(
  'media',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'media_id_seq',
      }),
    image: text('image'),
    mediaId: text('media_id'),
    modifiedAt: timestamp('modified_at', { withTimezone: true }),
    name: text('name').notNull().default(''),
    platform: text('platform'),
    rating: mediaRatingEnum('rating'),
    sortOrder: numeric('sort_order', { mode: 'number' }),
    status: mediaStatusEnum('status').default('wishlist'),
    type: mediaTypeEnum('type'),
    user: uuid('user').references(() => authUsers.id),
  },
  (table) => [index('media_user_idx').on(table.user)],
)

export const toots = pgTable(
  'toots',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    dbUserId: uuid('db_user_id').references(() => authUsers.id),
    hashtags: text('hashtags').array(),
    id: uuid('id').primaryKey().defaultRandom(),
    likedToot: boolean('liked_toot').notNull().default(false),
    media: json('media'),
    reply: json('reply'),
    text: text('text').default(''),
    tootId: text('toot_id'),
    tootUrl: text('toot_url'),
    urls: json('urls'),
    userAvatar: text('user_avatar'),
    userId: text('user_id'),
    userName: text('user_name'),
  },
  (table) => [
    uniqueIndex('toots_toot_id_key').on(table.tootId),
    index('toots_db_user_id_idx').on(table.dbUserId),
  ],
)

export const tweets = pgTable(
  'tweets',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    dbUserId: uuid('db_user_id').references(() => authUsers.id),
    hashtags: text('hashtags').array(),
    id: uuid('id').primaryKey().defaultRandom(),
    likedTweet: boolean('liked_tweet').notNull().default(false),
    media: json('media'),
    reply: json('reply'),
    text: text('text').default(''),
    tweetId: text('tweet_id'),
    tweetUrl: text('tweet_url'),
    urls: json('urls'),
    userAvatar: text('user_avatar'),
    userId: text('user_id'),
    userName: text('user_name'),
  },
  (table) => [index('tweets_db_user_id_idx').on(table.dbUserId)],
)

export const userIntegrations = pgTable('user_integrations', {
  blueskyAppPassword: text('bluesky_app_password'),
  blueskyEnabled: boolean('bluesky_enabled').notNull().default(false),
  blueskyHandle: text('bluesky_handle'),
  blueskyLastError: text('bluesky_last_error'),
  blueskyPostPrefix: text('bluesky_post_prefix'),
  blueskyPostSuffix: text('bluesky_post_suffix'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
})
