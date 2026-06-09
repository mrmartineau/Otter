type Json = unknown

export type BookmarkType =
  | 'link'
  | 'video'
  | 'audio'
  | 'recipe'
  | 'image'
  | 'document'
  | 'article'
  | 'game'
  | 'book'
  | 'event'
  | 'product'
  | 'note'
  | 'file'
  | 'place'

export type BookmarkStatus = 'active' | 'inactive'

export interface BaseBookmark {
  bluesky_post_uri: string | null
  click_count: number
  created_at: string
  description: string | null
  feed: string | null
  id: string
  image: string | null
  modified_at: string
  note: string | null
  public: boolean
  star: boolean
  status: BookmarkStatus
  tags: string[] | null
  title: string | null
  tweet: Json | null
  type: BookmarkType | null
  url: string | null
  user: string | null
}

export type Bookmark = Omit<BaseBookmark, 'tweet'> & {
  tweet?: {
    text: string
    username: string
    url: string
  } | null
}

export interface Tweet {
  created_at: string | null
  db_user_id: string | null
  hashtags: string[] | null
  id: string
  liked_tweet: boolean
  media: Json | null
  reply: Json | null
  text: string | null
  tweet_id: string | null
  tweet_url: string | null
  urls: Json | null
  user_avatar: string | null
  user_id: string | null
  user_name: string | null
}

export interface Toot {
  created_at: string | null
  db_user_id: string | null
  hashtags: string[] | null
  id: string
  liked_toot: boolean
  media: Json | null
  reply: Json | null
  text: string | null
  toot_id: string | null
  toot_url: string | null
  urls: Json | null
  user_avatar: string | null
  user_id: string | null
  user_name: string | null
}

export type TweetUrls = {
  url: string
  expanded_url: string
  display_url: string
  indices: number[]
}[]

export type TootUrls = {
  type: string
  isLink: boolean
  href: string
  value: string
  end: number
  start: number
}[]

export interface BookmarkFormValues
  extends Omit<
    Bookmark,
    | 'id'
    | 'created_at'
    | 'modified_at'
    | 'collection'
    | 'click_count'
    | 'excerpt'
  > {
  id?: string
}

export type UserRole = 'user' | 'admin'
export type SubscriptionPlan = 'free' | 'pro' | 'comp'
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'inactive'

/**
 * Billing cycle for a paying Pro user.
 *
 * - `monthly` / `annual` — recurring Stripe subscription
 * - `lifetime` — one-off payment, no renewal
 *
 * Null for free, comp and admin users.
 */
export type BillingCycle = 'monthly' | 'annual' | 'lifetime'

export interface UserProfile {
  api_key: string | null
  avatar_url: string | null
  id: string
  plan: SubscriptionPlan
  role: UserRole
  settings_collections_visible: boolean
  settings_group_by_date: boolean | null
  settings_pinned_tags: string[]
  settings_tags_visible: boolean
  settings_top_tags_count: number | null
  settings_types_visible: boolean
  updated_at: string | null
  username: string | null
}

export interface BookmarkQuota {
  limit: number | null
  used: number
  remaining: number | null
}

export interface BillingStatus {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  billing_cycle: BillingCycle | null
  cancel_at_period_end: boolean
  current_period_end: string | null
  has_stripe_customer: boolean
  quota: BookmarkQuota
}

export interface AdminUser {
  id: string
  email: string
  name: string
  username: string | null
  role: UserRole
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  billing_cycle: BillingCycle | null
  daily_bookmark_limit_override: number | null
  bookmark_count: number
  created_at: string
}

export interface AdminStats {
  total_users: number
  pro_users: number
  comp_users: number
  free_users: number
  admin_users: number
  monthly_subs: number
  annual_subs: number
  lifetime_users: number
  total_bookmarks: number
  public_bookmarks: number
  bookmarks_last_7_days: number
  bookmarks_last_30_days: number
  signups_last_7_days: number
  signups_last_30_days: number
  estimated_mrr: number
}

export interface UserIntegration {
  bluesky_app_password?: string | null
  bluesky_enabled: boolean
  bluesky_handle: string | null
  bluesky_last_error: string | null
  bluesky_post_prefix: string | null
  bluesky_post_suffix: string | null
  created_at: string
  updated_at: string | null
  user_id: string
}

export interface Collection {
  bookmark_count: number | null
  collection: string | null
  tags: string[] | null
}

export type MediaType =
  | 'tv'
  | 'film'
  | 'game'
  | 'book'
  | 'podcast'
  | 'music'
  | 'other'

export type MediaStatus = 'now' | 'skipped' | 'done' | 'wishlist'
export type MediaRating =
  | '0'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '4.5'
  | '5'

export interface Media {
  created_at: string
  id: number
  image: string | null
  media_id: string | null
  modified_at: string | null
  name: string
  platform: string | null
  rating: MediaRating | null
  sort_order: number | null
  status: MediaStatus | null
  type: MediaType | null
  user: string | null
}

export type MediaInsert = Omit<Media, 'created_at' | 'id' | 'modified_at'> & {
  created_at?: string
  id?: number
  modified_at?: string | null
}

export type MediaUpdate = Partial<MediaInsert>

export interface MediaFilters {
  search?: string
  type?: MediaType
  status?: MediaStatus
}
