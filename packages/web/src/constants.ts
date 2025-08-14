import urlJoin from 'proper-url-join'

import type { RequestOrder } from './types/api'

export const REPO_URL = 'https://github.com/mrmartineau/Otter'

export const ALLOW_SIGNUP = false

export const TITLE_SEPARATOR = ' — '
export const CONTENT = {
  accountSettingsTitle: 'Account, settings & integrations',
  addToLabel: 'Add to Otter',
  allDescription: 'All your items',
  appName: 'Otter',
  appSettingsTitle: 'App settings',
  collectionsNav: 'Collections',
  dashboardNav: 'Dashboard',
  dashboardTitle: 'Dashboard',
  editTitle: 'Edit',
  feedNav: 'Feed',
  feedTitle: 'Feed',
  findMatchingTags: 'Find matching tags',
  fixWithAi: 'Fix with AI',
  flatFeed: 'Flat',
  groupByDay: 'By day',
  integrationsSettingsTitle: 'Integrations',

  // used in the feed popover
  latestRssItems: 'Latest RSS feed items',
  mediaNav: 'Media',
  mediaTitle: 'Media',
  newBookmarkTitle: 'New bookmark',
  newDescription: 'Add new item',
  newerBtn: 'Newer',
  newTitle: 'New item',

  // used in the feed pagination area
  noItems: 'No items',
  noNewerItems: 'No newer items',
  noOlderItems: 'No older items',
  olderBtn: 'Older',
  publicNav: 'Public',
  publicTitle: 'Public',
  scrapeThisUrl: 'Scrape this URL',
  searchInputPlaceholder: 'Search',
  searchTitle: 'Search',
  settingsNav: 'Account & integrations',
  signInTitle: 'Sign in',
  signOutNav: 'Sign out',
  signupTitle: 'Register',
  starsNav: 'Stars',
  starsTitle: 'Stars',
  tagsNav: 'Tags',
  tootsLikeTitle: 'My liked toots',
  tootsMineTitle: 'My toots',
  tootsNav: 'Toots',
  tootsTitle: 'Toots',
  topLinksNav: 'Top links',
  topLinksTitle: 'Top links',
  trashNav: 'Trash',
  trashTitle: 'Trash',
  tweetsLikeTitle: 'My liked tweets',
  tweetsMineTitle: 'My tweets',
  tweetsNav: 'Tweets',
  tweetsTitle: 'Tweets',
  typesNav: 'Types',
} as const

export const createTitle = (pageName?: keyof typeof CONTENT | string) => {
  const theTitle = pageName
    ? CONTENT[pageName as keyof typeof CONTENT] || pageName
    : ''
  return `${theTitle ? `${theTitle}${TITLE_SEPARATOR}` : ''}${CONTENT.appName}`
}

// Page Routes
export const ROUTE_DASHBOARD = '/dashboard'
export const ROUTE_HOME = ROUTE_DASHBOARD
export const ROUTE_FEED = '/feed'
export const ROUTE_SIGNIN = '/signin'
export const ROUTE_NEW_BOOKMARK = '/new/bookmark'
export const ROUTE_STARS = '/stars'
export const ROUTE_PUBLIC = '/public'
export const ROUTE_STATS = '/top'
export const ROUTE_TRASH = '/trash'
export const ROUTE_SETTINGS_ACCOUNT = '/settings/account'
export const ROUTE_TOOTS_MINE = '/toots'
export const ROUTE_TOOTS_LIKES = '/toots/likes'
export const ROUTE_TWEETS_MINE = '/tweets'
export const ROUTE_TWEETS_LIKES = '/tweets/likes'
export const ROUTE_MEDIA = '/media'

// API Routes
export const API_AUTH = '/api/auth.json'
export const API_FEED = '/api/feed'
export const API_SCRAPE = '/api/scrape'
export const API_SEARCH = '/api/search'
export const API_DEBUG = '/api/debug'
export const API_BOOKMARK_BASE = '/api/bookmark'
export const API_BOOKMARK_NEW = urlJoin(API_BOOKMARK_BASE, 'new')
export const API_BOOKMARK_EDIT = '/api/bookmark/edit'
export const API_ARCHIVE_BOOKMARK = '/api/archive/bookmark'
export const API_DELETE_BOOKMARK = '/api/delete/bookmark'
export const API_META = '/api/meta'
export const API_RSS = '/api/rss'
export const API_TWEETS = '/api/tweets'
export const API_TWEETS_SEARCH = '/api/search/tweets'

export const API_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// Default payload/responses
export const RESP_USER_GUEST = {
  guest: true,
}

export const DEFAULT_API_RESPONSE_LIMIT = 20
export const DEFAULT_API_RESPONSE_ORDER: RequestOrder = 'desc'
export const MINIMUM_CLICK_COUNT = 1

export const DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER = 'https://zander.wtf'
