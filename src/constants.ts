import urlJoin from 'proper-url-join';

import { RequestOrder } from './types/api';

export const CONTENT = {
  appName: 'Otter',
  titleSeparator: ' — ',
  feedTitle: 'Feed',
  feedNav: 'Feed',
  allDescription: 'All your items',
  searchTitle: 'Search',
  searchInputPlaceholder: 'Search',
  trashTitle: 'Trash',
  starsTitle: 'Stars',
  starsNav: 'Stars',
  editTitle: 'Edit',
  newTitle: 'New item',
  newDescription: 'Add new item',
  topLinksTitle: 'Top links',
  topLinksNav: 'Top links',
  trashNav: 'Trash',
  settingsNav: 'Settings',
  signInTitle: 'Sign in',
  signupTitle: 'Register',
  signOutNav: 'Sign out',
  typesNav: 'Types',
  tagsNav: 'Tags',
  tootsLikeNav: 'Liked toots',
  tootsLikeTitle: 'Liked toots',
  tootsMineNav: 'My toots',
  tootsMineTitle: 'My toots',
  tweetsLikeNav: 'Liked tweets',
  tweetsLikeTitle: 'Liked tweets',
  tweetsMineNav: 'My tweets',
  tweetsMineTitle: 'My tweets',
  groupByDay: 'By day',
  flatFeed: 'Flat',
  accountSettingsTitle: 'Account settings',
  appSettingsTitle: 'App settings',
  integrationsSettingsTitle: 'Integrations',
  addToLabel: 'Add to Otter',
  findMatchingTags: 'Find matching tags',
  scrapeThisUrl: 'Scrape this URL',

  // used in the feed pagination area
  noItems: 'No items',
  newerBtn: 'Newer',
  noNewerItems: 'No newer items',
  olderBtn: 'Older',
  noOlderItems: 'No older items',

  // used in the feed popover
  latestRssItems: 'Latest RSS feed items',
};

export const createTitle = (pageName?: string) => {
  // @ts-ignore
  const theTitle = pageName ? CONTENT[pageName] || pageName : '';
  return `${theTitle ? `${theTitle}${CONTENT.titleSeparator}` : ''}${
    CONTENT.appName
  }`;
};

// Page Routes
export const ROUTE_HOME = '/';
export const ROUTE_FEED_HOME = '/feed';
export const ROUTE_SIGNIN = '/signin';
export const ROUTE_SIGNUP = '/signup';
export const ROUTE_SIGNOUT = '/signout';
export const ROUTE_NEW_BOOKMARK = '/new/bookmark';
export const ROUTE_STARS = '/stars';
export const ROUTE_STATS = '/top';
export const ROUTE_TRASH = '/trash';
export const ROUTE_SETTINGS_ACCOUNT = '/settings/account';
export const ROUTE_TOOTS_LIKES = '/toots/likes';
export const ROUTE_TOOTS_MINE = '/toots/mine';
export const ROUTE_TWEETS_LIKES = '/tweets/likes';
export const ROUTE_TWEETS_MINE = '/tweets/mine';

// API Routes
export const API_AUTH = '/api/auth.json';
export const API_FEED = '/api/feed';
export const API_SCRAPE = '/api/scrape';
export const API_SEARCH = '/api/search';
export const API_DEBUG = '/api/debug';
export const API_BOOKMARK_BASE = '/api/bookmark';
export const API_BOOKMARK_NEW = urlJoin(API_BOOKMARK_BASE, 'new');
export const API_BOOKMARK_EDIT = '/api/bookmark/edit';
export const API_ARCHIVE_BOOKMARK = '/api/archive/bookmark';
export const API_DELETE_BOOKMARK = '/api/delete/bookmark';
export const API_META = '/api/meta';
export const API_RSS = '/api/rss';
export const API_TWEETS = '/api/tweets';
export const API_TWEETS_SEARCH = '/api/search/tweets';

export const API_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Default payload/responses
export const RESP_USER_GUEST = {
  guest: true,
};

export const DEFAULT_API_RESPONSE_LIMIT = 20;
export const DEFAULT_API_RESPONSE_ORDER: RequestOrder = 'desc';
export const MINIMUM_CLICK_COUNT = 1;

export const DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER = 'https://zander.wtf';
