import './polyfill'
import Defuddle from 'defuddle'
import type { HonoRequest } from 'hono'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'
import {
  generateErrorJSONResponse,
  generateJSONResponse,
} from './json-response'
import { linkType } from './link-type'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export interface ScrapeContentResponse {
  title: string
  author: string
  published: string
  description: string
  domain: string
  content: string
  wordCount: number
  source: string
  url: string
  urlType: string
  favicon?: string
  image?: string
  site?: string
}

async function fetchAndParse(
  targetUrl: string,
): Promise<ScrapeContentResponse> {
  const response = await fetch(targetUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; OtterBot/1.0)',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`,
    )
  }

  const contentType = response.headers.get('content-type') || ''
  if (
    !contentType.includes('text/html') &&
    !contentType.includes('application/xhtml+xml')
  ) {
    throw new Error(`Not an HTML page (content-type: ${contentType})`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_SIZE) {
    throw new Error(
      `Page too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB, max 5MB)`,
    )
  }

  const html = await response.text()
  if (html.length > MAX_SIZE) {
    throw new Error(
      `Page too large (${Math.round(html.length / 1024 / 1024)}MB, max 5MB)`,
    )
  }

  const { document } = parseHTML(html)

  // Stub missing APIs for defuddle in Workers environment
  const doc = document as any
  if (!doc.styleSheets) doc.styleSheets = []
  if (doc.defaultView && !doc.defaultView.getComputedStyle) {
    doc.defaultView.getComputedStyle = () => ({ display: '' })
  }

  const defuddle = new Defuddle(document as any, {
    url: targetUrl,
  })
  const result = defuddle.parse()

  const turndown = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
  })
  const markdown = turndown.turndown(result.content || '')

  return {
    author: result.author || '',
    content: markdown,
    description: result.description || '',
    domain: result.domain || '',
    favicon: result.favicon,
    image: result.image,
    published: result.published || '',
    site: result.site,
    source: targetUrl,
    title: result.title || '',
    url: response.url || targetUrl,
    urlType: linkType(targetUrl, Boolean(result?.author)),
    wordCount: result.wordCount || 0,
  }
}

export const handleScrapeContent = async (request: HonoRequest) => {
  const searchParams = new URL(request.url).searchParams
  let url = searchParams.get('url')

  if (!url) {
    return generateErrorJSONResponse(
      'Please provide a `url` query parameter, e.g. ?url=https://example.com',
    )
  }

  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = 'https://' + url
  }

  try {
    const result = await fetchAndParse(url)
    return generateJSONResponse(result)
  } catch (error) {
    return generateErrorJSONResponse(error, url)
  }
}
