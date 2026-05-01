import { Hono } from 'hono'

import { createAuth } from '../auth/server'
import { classifyBookmark } from './ai/classify'
import { descriptionSystemPrompt } from './ai/description'
import { generateResponse } from './ai/generateResponse'
import { MAX_CONTENT_LENGTH, summariseSystemPrompt } from './ai/summarise'
import { titleSystemPrompt } from './ai/title'
import { sendBlueskyPost } from './bluesky/sendBlueskyPost'
import { getAllBookmarks } from './bookmarks/getAllBookmarks'
import { getRecentPublicBookmarks } from './bookmarks/getRecentPublicBookmarks'
import {
  checkBookmarkUrl,
  createBookmark,
  deleteBookmarkById,
  getBookmarkById,
  incrementBookmarkClickCount,
  updateBookmarkById,
} from './bookmarks/item'
import { getNewBookmark, postNewBookmark } from './bookmarks/new'
import { getDashboard } from './dashboard'
import type { WorkerEnv } from './env'
import {
  getBlueskyIntegration,
  toggleBlueskyIntegration,
  upsertBlueskyIntegration,
} from './integrations'
import {
  handleMcpDelete,
  handleMcpGet,
  handleMcpOptions,
  handleMcpPost,
} from './mcp/handler'
import {
  createMedia,
  deleteMedia,
  getMedia,
  getMediaItem,
  updateMedia,
} from './media/media'
import { getMediaSearch } from './media/mediaSearch'
import {
  getCollectionBookmarks,
  getCollectionsTags,
  getMeta,
  getTags,
  renameTag,
} from './meta'
import { getCurrentProfile, updateCurrentProfile } from './profile'
import { feedToJson } from './rss/rss-to-json'
import { handleScrapeContent } from './scraper/scrape-content'
import { getSearch } from './search/search'
import {
  getToot,
  getToots,
  getTweet,
  getTweets,
  searchToots,
  searchTweets,
} from './social'
import { sendToots } from './toots/sendToots'

export const api = new Hono<{ Bindings: WorkerEnv }>()

api.get('/', (c) => {
  return c.text('Otter API', 200)
})

api.all('/auth/*', async (c) => {
  return await createAuth(c.env).handler(c.req.raw)
})
api.get('/me', async (c) => {
  return await getCurrentProfile(c)
})
api.patch('/me', async (c) => {
  return await updateCurrentProfile(c)
})

api.post('/new', async (c) => {
  return await postNewBookmark(c)
})
api.get('/new', async (c) => {
  return await getNewBookmark(c)
})
api.get('/bookmarks', async (c) => {
  return await getAllBookmarks(c)
})
api.post('/bookmarks', async (c) => {
  return await createBookmark(c)
})
api.get('/bookmarks/:id', async (c) => {
  return await getBookmarkById(c)
})
api.patch('/bookmarks/:id', async (c) => {
  return await updateBookmarkById(c)
})
api.delete('/bookmarks/:id', async (c) => {
  return await deleteBookmarkById(c)
})
api.post('/bookmarks/:id/click', async (c) => {
  return await incrementBookmarkClickCount(c)
})
api.get('/check-url', async (c) => {
  return await checkBookmarkUrl(c)
})
api.get('/recent', async (c) => {
  return await getRecentPublicBookmarks(c.req, c.env)
})
api.get('/search', async (c) => {
  return await getSearch(c)
})
api.get('/search/tweets', async (c) => {
  return await searchTweets(c)
})
api.get('/search/toots', async (c) => {
  return await searchToots(c)
})
api.get('/dashboard', async (c) => {
  return await getDashboard(c)
})
api.get('/tweets', async (c) => {
  return await getTweets(c)
})
api.get('/tweets/:id', async (c) => {
  return await getTweet(c)
})
api.get('/toots', async (c) => {
  return await getToots(c)
})
api.get('/toots/:id', async (c) => {
  return await getToot(c)
})
api.get('/media', async (c) => {
  return await getMedia(c)
})
api.post('/media', async (c) => {
  return await createMedia(c)
})
api.get('/media/:id', async (c) => {
  return await getMediaItem(c)
})
api.patch('/media/:id', async (c) => {
  return await updateMedia(c)
})
api.delete('/media/:id', async (c) => {
  return await deleteMedia(c)
})
api.get('/media-search', async (c) => {
  return await getMediaSearch(c.req)
})
api.get('/meta', async (c) => {
  return await getMeta(c)
})
api.get('/tags', async (c) => {
  return await getTags(c)
})
api.patch('/tags/rename', async (c) => {
  return await renameTag(c)
})
api.get('/collections-tags', async (c) => {
  return await getCollectionsTags(c)
})
api.get('/collections/:collection', async (c) => {
  return await getCollectionBookmarks(c)
})
api.get('/integrations/bluesky', async (c) => {
  return await getBlueskyIntegration(c)
})
api.put('/integrations/bluesky', async (c) => {
  return await upsertBlueskyIntegration(c)
})
api.patch('/integrations/bluesky', async (c) => {
  return await toggleBlueskyIntegration(c)
})
api.post('/toot', async (c) => {
  return await sendToots(c)
})
api.post('/bluesky', async (c) => {
  return await sendBlueskyPost(c)
})
api.get('/scrape', async (c) => {
  return await handleScrapeContent(c.req)
})
api.get('/scrape-content', async (c) => {
  return await handleScrapeContent(c.req)
})
api.post('/ai/title', async (context) => {
  const { prompt } = await context.req.json()
  return await generateResponse({
    context,
    prompt,
    systemPrompt: titleSystemPrompt,
  })
})
api.post('/ai/description', async (context) => {
  const { title, prompt } = await context.req.json()
  return await generateResponse({
    context,
    prompt,
    systemPrompt: descriptionSystemPrompt(title),
  })
})
api.post('/ai/summarise', async (context) => {
  const { prompt } = await context.req.json()
  const truncated = prompt.slice(0, MAX_CONTENT_LENGTH)
  return await generateResponse({
    context,
    prompt: truncated,
    systemPrompt: summariseSystemPrompt,
  })
})
api.post('/ai/classify', async (context) => {
  const { title, description, url, tags, currentType } =
    await context.req.json()
  const result = await classifyBookmark({
    context,
    currentType: currentType ?? 'link',
    description: description ?? '',
    existingTags: tags ?? [],
    title: title ?? '',
    url: url ?? '',
  })
  return context.json(result)
})
api.post('/mcp', async (c) => {
  return await handleMcpPost(c)
})
api.get('/mcp', (c) => {
  return handleMcpGet(c)
})
api.delete('/mcp', (c) => {
  return handleMcpDelete(c)
})
api.options('/mcp', (c) => {
  return handleMcpOptions(c)
})
api.get('/rss', async (c) => {
  const feed = c.req.query('feed')
  const isValidUrl = new URL(feed ?? '')

  if (isValidUrl && feed) {
    const jsonFeed = await feedToJson(feed)
    return c.json(jsonFeed)
  }

  return c.json(
    {
      error: 'Feed not found',
    },
    404,
  )
})

export const app = new Hono<{ Bindings: WorkerEnv }>()

app.all('/.well-known/oauth-authorization-server/api/auth', async (c) => {
  return await createAuth(c.env).handler(c.req.raw)
})
app.all('/.well-known/openid-configuration/api/auth', async (c) => {
  return await createAuth(c.env).handler(c.req.raw)
})
app.route('/api', api)

app.notFound(async (c) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    const assetResponse = await c.env.ASSETS?.fetch(c.req.raw)

    if (assetResponse) {
      return assetResponse
    }
  }

  return c.text('Not found', 404)
})

app.onError((err, c) => {
  console.error(err)
  console.error(err.stack)
  return c.text(err.message, 500)
})
