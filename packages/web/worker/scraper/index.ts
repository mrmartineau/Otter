import type { HonoRequest } from 'hono'
import { TidyURL } from 'tidy-url'
import type { MetadataResponse } from '@/types/api'
import {
  generateErrorJSONResponse,
  generateJSONResponse,
} from './json-response'
import { linkType } from './link-type'
import Scraper from './scraper'
import { scraperRules } from './scraper-rules'

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

/**
 * Scrapes a page's metadata in-process. Handlers that need metadata call this
 * directly — a Worker cannot fetch its own relative `/api/scrape` URL, and the
 * browser helper in `src/utils/fetching/scrape.ts` is for the SPA only.
 *
 * The URL is fetched through `Scraper`, which applies the SSRF guard.
 */
export const scrapeMetadata = async (
  rawUrl: string,
  { cleanUrl = true }: { cleanUrl?: boolean } = {},
): Promise<MetadataResponse> => {
  const scraper = new Scraper()
  let url = rawUrl

  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = `https://${url}`
  }

  const requestedUrl = new URL(url)

  // If the url is a reddit url, use old.reddit.com because it has much
  // more information when scraping
  if (url.includes('reddit.com')) {
    requestedUrl.hostname = 'old.reddit.com'
    url = requestedUrl.toString()
  }

  await scraper.fetch(url)

  // Get metadata using the rules defined in `src/scraper-rules.ts`
  const response: Record<string, ScrapeResponse> =
    await scraper.getMetadata(scraperRules)

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

  // Parse JSON-LD — if the script content is malformed, fall back to null
  // rather than failing the entire scrape response
  if (response?.jsonld) {
    try {
      response.jsonld = JSON.parse(response.jsonld as string)
    } catch {
      response.jsonld = {} as JSONObject
    }
  }

  return response as unknown as MetadataResponse
}

export const handleScrape = async (request: HonoRequest) => {
  const searchParams = new URL(request.url).searchParams
  const url = searchParams.get('url')

  if (!url) {
    return generateErrorJSONResponse(
      'Please provide a `url` query parameter, e.g. ?url=https://example.com',
    )
  }

  try {
    return generateJSONResponse(
      await scrapeMetadata(url, {
        cleanUrl: Boolean(searchParams.get('cleanUrl')),
      }),
    )
  } catch (error) {
    return generateErrorJSONResponse(error, url)
  }
}
