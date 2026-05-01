import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
} from 'drizzle-orm'
import type { Context } from 'hono'
import { API_HEADERS, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { apiParameters } from '@/utils/fetching/apiParameters'
import { apiResponseGenerator } from '@/utils/fetching/apiResponse'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { searchParamsToObject } from '@/utils/searchParamsToObject'
import { toots, tweets } from '../db/schema'
import { requireRequestContext } from './context'
import type { WorkerEnv } from './env'

type HonoContext = Context<{ Bindings: WorkerEnv }>
type TweetRow = typeof tweets.$inferSelect
type TootRow = typeof toots.$inferSelect

const tweetToRow = (tweet: TweetRow) => ({
  created_at: tweet.createdAt?.toISOString() ?? null,
  db_user_id: tweet.dbUserId,
  hashtags: tweet.hashtags,
  id: tweet.id,
  liked_tweet: tweet.likedTweet,
  media: tweet.media,
  reply: tweet.reply,
  text: tweet.text,
  tweet_id: tweet.tweetId,
  tweet_url: tweet.tweetUrl,
  urls: tweet.urls,
  user_avatar: tweet.userAvatar,
  user_id: tweet.userId,
  user_name: tweet.userName,
})

const tootToRow = (toot: TootRow) => ({
  created_at: toot.createdAt?.toISOString() ?? null,
  db_user_id: toot.dbUserId,
  hashtags: toot.hashtags,
  id: toot.id,
  liked_toot: toot.likedToot,
  media: toot.media,
  reply: toot.reply,
  text: toot.text,
  toot_id: toot.tootId,
  toot_url: toot.tootUrl,
  urls: toot.urls,
  user_avatar: toot.userAvatar,
  user_id: toot.userId,
  user_name: toot.userName,
})

const getAuthed = async (context: HonoContext) => {
  const requestContext = await requireRequestContext(context)

  if (requestContext instanceof Response) {
    return requestContext
  }

  const userId = requestContext.user?.id

  if (!userId) {
    return errorResponse({ reason: 'Not authorised', status: 401 })
  }

  return { requestContext, userId }
}

const getIdParam = (context: HonoContext) => {
  const id = context.req.param('id')

  if (!id) {
    throw new Error('Missing social item id')
  }

  return id
}

export const getTweets = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
    } = apiParameters(searchParamsToObject(context.req.url))
    const liked = context.req.query('liked') === 'true'
    const where = and(
      eq(tweets.dbUserId, auth.userId),
      eq(tweets.likedTweet, liked),
    )
    const [{ value: total }] = await auth.requestContext.db
      .select({ value: count() })
      .from(tweets)
      .where(where)
    const data = await auth.requestContext.db
      .select()
      .from(tweets)
      .where(where)
      .orderBy(order === 'asc' ? asc(tweets.createdAt) : desc(tweets.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: total ?? 0,
          data: data.map(tweetToRow),
          limit,
          offset,
          path: context.req.url,
        }),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting tweets',
      status: 400,
    })
  }
}

export const getTweet = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const [tweet] = await auth.requestContext.db
      .select()
      .from(tweets)
      .where(
        and(
          eq(tweets.id, getIdParam(context)),
          eq(tweets.dbUserId, auth.userId),
        ),
      )
      .limit(1)

    if (!tweet) {
      return errorResponse({
        error: 'Tweet not found',
        reason: 'Tweet not found or access denied',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: tweetToRow(tweet), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting tweet',
      status: 400,
    })
  }
}

export const getToots = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
    } = apiParameters(searchParamsToObject(context.req.url))
    const liked = context.req.query('liked') === 'true'
    const where = and(
      eq(toots.dbUserId, auth.userId),
      eq(toots.likedToot, liked),
    )
    const [{ value: total }] = await auth.requestContext.db
      .select({ value: count() })
      .from(toots)
      .where(where)
    const data = await auth.requestContext.db
      .select()
      .from(toots)
      .where(where)
      .orderBy(order === 'asc' ? asc(toots.createdAt) : desc(toots.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: total ?? 0,
          data: data.map(tootToRow),
          limit,
          offset,
          path: context.req.url,
        }),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting toots',
      status: 400,
    })
  }
}

export const getToot = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const [toot] = await auth.requestContext.db
      .select()
      .from(toots)
      .where(
        and(eq(toots.id, getIdParam(context)), eq(toots.dbUserId, auth.userId)),
      )
      .limit(1)

    if (!toot) {
      return errorResponse({
        error: 'Toot not found',
        reason: 'Toot not found or access denied',
        status: 404,
      })
    }

    return new Response(
      JSON.stringify({ data: tootToRow(toot), error: null }),
      {
        headers: API_HEADERS,
        status: 200,
      },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem getting toot',
      status: 400,
    })
  }
}

export const searchTweets = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const { q, ...rawParams } = searchParamsToObject(context.req.url)
    const searchTerm = String(q ?? '')
    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
    } = apiParameters(rawParams)
    const pattern = `%${searchTerm}%`
    const where = and(
      eq(tweets.dbUserId, auth.userId),
      or(
        ilike(tweets.text, pattern),
        ilike(tweets.userName, pattern),
        searchTerm ? arrayContains(tweets.hashtags, [searchTerm]) : undefined,
      ),
    )
    const [{ value: total }] = await auth.requestContext.db
      .select({ value: count() })
      .from(tweets)
      .where(where)
    const data = await auth.requestContext.db
      .select()
      .from(tweets)
      .where(where)
      .orderBy(order === 'asc' ? asc(tweets.createdAt) : desc(tweets.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: total ?? 0,
          data: data.map(tweetToRow),
          limit,
          offset,
          path: context.req.url,
        }),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem searching tweets',
      status: 400,
    })
  }
}

export const searchToots = async (context: HonoContext) => {
  try {
    const auth = await getAuthed(context)

    if (auth instanceof Response) {
      return auth
    }

    const { q, ...rawParams } = searchParamsToObject(context.req.url)
    const searchTerm = String(q ?? '')
    const {
      limit = DEFAULT_API_RESPONSE_LIMIT,
      offset = 0,
      order,
    } = apiParameters(rawParams)
    const pattern = `%${searchTerm}%`
    const where = and(
      eq(toots.dbUserId, auth.userId),
      or(
        ilike(toots.text, pattern),
        ilike(toots.userName, pattern),
        ilike(toots.userId, pattern),
        searchTerm ? arrayContains(toots.hashtags, [searchTerm]) : undefined,
      ),
    )
    const [{ value: total }] = await auth.requestContext.db
      .select({ value: count() })
      .from(toots)
      .where(where)
    const data = await auth.requestContext.db
      .select()
      .from(toots)
      .where(where)
      .orderBy(order === 'asc' ? asc(toots.createdAt) : desc(toots.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(
      JSON.stringify(
        apiResponseGenerator({
          count: total ?? 0,
          data: data.map(tootToRow),
          limit,
          offset,
          path: context.req.url,
        }),
      ),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem searching toots',
      status: 400,
    })
  }
}
