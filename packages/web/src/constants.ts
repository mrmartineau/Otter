import urlJoin from 'proper-url-join'

import type { RequestOrder } from './types/api'

export const REPO_URL = 'https://github.com/mrmartineau/Otter'

export const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === 'true'

/**
 * Master switch for all paid-tier features (Stripe checkout, daily quota,
 * Pro-gated AI, billing/pricing UI). Defaults to enabled; set
 * `VITE_BILLING_ENABLED=false` at build time to run Otter as a single-tier
 * free instance — every user gets unlimited bookmarks and full AI access.
 * Build-time only — read by both the SPA and (via this constant) the worker.
 */
export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED !== 'false'

export const TITLE_SEPARATOR = ' — '
export const CONTENT = {
  accountSettingsTitle: 'Account, settings & integrations',
  addToLabel: 'Add to Otter',
  adminNav: 'Admin',
  adminTitle: 'Admin',
  adminUsersTitle: 'Users',
  allDescription: 'All your items',
  appName: 'Otter',
  appSettingsTitle: 'App settings',
  billingNav: 'Billing',
  billingTitle: 'Billing & plan',
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
  pricingTitle: 'Pricing',
  publicNav: 'Public',
  publicTitle: 'Public',
  scrapeThisUrl: 'Scrape this URL',
  searchInputPlaceholder: 'Search',
  searchTitle: 'Search',
  settingsNav: 'Account',
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
export const ROUTE_SIGNUP = '/register'
export const ROUTE_NEW_BOOKMARK = '/new/bookmark'
export const ROUTE_NEW_BOOKMARK_CONFIRMATION = '/new/bookmark/confirmation'
export const ROUTE_STARS = '/stars'
export const ROUTE_PUBLIC = '/public'
export const ROUTE_RECENT = '/recent'
export const ROUTE_STATS = '/top'
export const ROUTE_TRASH = '/trash'
export const ROUTE_SETTINGS_ACCOUNT = '/settings/account'
export const ROUTE_SETTINGS_BILLING = '/settings/billing'
export const ROUTE_PRICING = '/pricing'
export const ROUTE_ADMIN = '/admin'
export const ROUTE_ADMIN_USERS = '/admin/users'
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
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

// Default payload/responses
export const RESP_USER_GUEST = {
  guest: true,
}

export const DEFAULT_API_RESPONSE_LIMIT = 19
export const DEFAULT_API_RESPONSE_ORDER: RequestOrder = 'desc'
export const MINIMUM_CLICK_COUNT = 1

export const DEFAULT_BOOKMARK_FORM_URL_PLACEHOLDER = 'https://zander.wtf'

// Billing & plans
//
// The default number of bookmarks a free user may create each day. The live
// value is configurable per-deployment via the `FREE_DAILY_BOOKMARK_LIMIT`
// worker env var, and per-user via the `daily_bookmark_limit_override` column.
// This constant is the fallback default and the value shown in marketing copy.
export const DEFAULT_FREE_DAILY_BOOKMARK_LIMIT = 10

/**
 * One billing tier the user can pick at checkout. `free` is the default
 * untyped state; the three pro tiers correspond to one Stripe product with
 * three prices.
 */
export type TierId = 'free' | 'monthly' | 'annual' | 'lifetime'

/** Billing cycle stored on a paying user's profile. */
export type BillingCycleId = 'monthly' | 'annual' | 'lifetime'

export interface BillingTier {
  id: TierId
  name: string
  /** Price in whole units of currency (GBP). */
  price: number
  priceLabel: string
  /** Short period suffix shown next to the price (e.g. "/ month"). */
  periodLabel: string | null
  tagline: string
  features: string[]
  /** Stripe checkout mode this tier maps to. */
  mode: 'free' | 'subscription' | 'payment'
}

export const PRO_FEATURES = [
  'Unlimited new bookmarks',
  'Everything in Free',
  'AI titles, summaries & classification',
  'Priority support',
] as const

export const BILLING_TIERS: Record<TierId, BillingTier> = {
  annual: {
    features: [...PRO_FEATURES, 'Two months free vs monthly'],
    id: 'annual',
    mode: 'subscription',
    name: 'Pro · Annual',
    periodLabel: '/ year',
    price: 48,
    priceLabel: '£48',
    tagline: 'Best value if you stick around',
  },
  free: {
    features: [
      `${DEFAULT_FREE_DAILY_BOOKMARK_LIMIT} new bookmarks per day`,
      'Unlimited bookmark storage',
      'Tags, collections, search & RSS',
      'Browser extensions & bookmarklet',
    ],
    id: 'free',
    mode: 'free',
    name: 'Free',
    periodLabel: null,
    price: 0,
    priceLabel: 'Free',
    tagline: 'For getting started',
  },
  lifetime: {
    features: [...PRO_FEATURES, 'One payment, forever'],
    id: 'lifetime',
    mode: 'payment',
    name: 'Pro · Lifetime',
    periodLabel: 'one-off',
    price: 199,
    priceLabel: '£199',
    tagline: 'Pay once, done',
  },
  monthly: {
    features: [...PRO_FEATURES],
    id: 'monthly',
    mode: 'subscription',
    name: 'Pro · Monthly',
    periodLabel: '/ month',
    price: 5,
    priceLabel: '£5',
    tagline: 'For people who save a lot',
  },
}

/** Order tiers are displayed in marketing/billing UI. */
export const TIER_DISPLAY_ORDER: TierId[] = [
  'free',
  'monthly',
  'annual',
  'lifetime',
]

/** Paid tiers only (excludes free). */
export const PAID_TIERS: BillingCycleId[] = ['monthly', 'annual', 'lifetime']
