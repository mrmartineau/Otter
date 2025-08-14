import { Hono } from 'hono'
import { descriptionSystemPrompt } from './ai/description'
import { generateResponse } from './ai/generateResponse'
import { titleSystemPrompt } from './ai/title'
import { getAllBookmarks } from './bookmarks/getAllBookmarks'
import { getNewBookmark, postNewBookmark } from './bookmarks/new'
import { feedToJson } from './rss/rss-to-json'
import { handleScrape } from './scraper'
import { getSearch } from './search/search'
import { sendToots } from './toots/sendToots'

// export interface Env {
//   AI: Ai
// }

export const app = new Hono().basePath('/api')

app.get('/', (c) => {
  return c.text('Otter API')
})

app.post('/new', async (c) => {
  return await postNewBookmark(c.req)
})
app.get('/new', async (c) => {
  return await getNewBookmark(c.req)
})
app.get('/bookmarks', async (c) => {
  return await getAllBookmarks(c.req)
})
app.get('/search', async (c) => {
  return await getSearch(c.req)
})
app.post('/toot', async (c) => {
  return await sendToots(c.req)
})

app.get('/scrape', async (c) => {
  return await handleScrape(c.req)
})

app.post('/ai/title', async (context) => {
  const { prompt } = await context.req.json()
  return await generateResponse({
    context,
    prompt,
    systemPrompt: titleSystemPrompt,
  })
})

app.post('/ai/description', async (context) => {
  const { title, prompt } = await context.req.json()
  return await generateResponse({
    context,
    prompt,
    systemPrompt: descriptionSystemPrompt(title),
  })
})

app.get('/rss', async (c) => {
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

app.notFound((c) => {
  return c.text('Not found', 404)
})

app.onError((err, c) => {
  console.error(`${err}`)
  return c.text(err.message, 500)
})
