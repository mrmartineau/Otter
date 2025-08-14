import type { HonoRequest } from 'hono'
import { TidyURL } from 'tidy-url'
import {
  generateErrorJSONResponse,
  generateJSONResponse,
} from './json-response'
import { linkType } from './link-type'
import Scraper from './scraper'
import { scraperRules } from './scraper-rules'

// addEventListener('fetch', (event: FetchEvent) => {
//   event.respondWith(handleScrape(event.request))
// })

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

interface JSONObject {
  [k: string]: JSONValue
}

export type ScrapeResponse = string | string[] | JSONObject

export const handleScrape = async (request: HonoRequest) => {
  const searchParams = new URL(request.url).searchParams
  const scraper = new Scraper()
  let response: Record<string, ScrapeResponse>
  let url = searchParams.get('url')
  const cleanUrl = searchParams.get('cleanUrl')

  if (!url) {
    return generateErrorJSONResponse(
      'Please provide a `url` query parameter, e.g. ?url=https://example.com',
    )
  }

  if (url && !url.match(/^[a-zA-Z]+:\/\//)) {
    url = 'https://' + url
  }

  try {
    const requestedUrl = new URL(url)

    // If the url is a reddit url, use old.reddit.com because it has much
    // more information when scraping
    if (url.includes('reddit.com')) {
      requestedUrl.hostname = 'old.reddit.com'
      url = requestedUrl.toString()
    }

    await scraper.fetch(url)
  } catch (error) {
    return generateErrorJSONResponse(error, url)
  }

  try {
    // Get metadata using the rules defined in `src/scraper-rules.ts`
    response = await scraper.getMetadata(scraperRules)

    const unshortenedUrl = scraper.response.url

    // Add cleaned url
    if (cleanUrl) {
      const cleanedUrl = TidyURL.clean(unshortenedUrl || url)
      response.cleaned_url = cleanedUrl.url
    }

    // Add unshortened url
    response.url = unshortenedUrl

    // Add url type
    response.urlType = linkType(url, false)

    // Parse JSON-LD
    if (response?.jsonld) {
      response.jsonld = JSON.parse(response.jsonld as string)
    }
  } catch (error) {
    return generateErrorJSONResponse(error, url)
  }

  return generateJSONResponse(response)
}
