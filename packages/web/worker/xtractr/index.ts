import './polyfill.js'
import Defuddle from 'defuddle'
import { parseHTML } from 'linkedom'
import { createMarkdownContent } from './defuddle/markdown'
import { MAX_SIZE, readResponseWithLimit } from './fetch'
import { followShortUrl } from './follow-short-url'
import { detectPageType } from './page-type'
import type { DefuddleCompatDocument, XtractResponse } from './xtract-response'

export async function xtract(targetUrl: string): Promise<XtractResponse> {
  console.log(`🚀 ~ xtract ~ targetUrl:`, targetUrl)
  const { unshortened_url, urls } = await followShortUrl([targetUrl])
  const resolvedShortUrl = unshortened_url || targetUrl

  const response = await fetch(resolvedShortUrl, {
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
  if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
    throw new Error(
      `Page too large (${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB, max 5MB)`,
    )
  }

  const html = await readResponseWithLimit(response)
  const parsedWindow = parseHTML(html)
  const document = parsedWindow.document as unknown as Document

  const doc = document as DefuddleCompatDocument
  if (!doc.styleSheets) {
    Object.defineProperty(doc, 'styleSheets', {
      configurable: true,
      value: [],
      writable: true,
    })
  }
  if (doc.defaultView && !doc.defaultView.getComputedStyle) {
    doc.defaultView.getComputedStyle = () =>
      ({ display: '' }) as CSSStyleDeclaration
  }

  const finalUrl = response.url || resolvedShortUrl
  const defuddle = new Defuddle(document, {
    markdown: true,
    url: finalUrl,
    useAsync: true,
  })

  const result = await defuddle.parseAsync()

  const markdown = createMarkdownContent(result.content)

  const computedPageType = detectPageType(
    finalUrl,
    Boolean(result?.author),
    result?.schemaOrgData,
    result?.metaTags,
  )

  return {
    author: result.author || '',
    content: markdown || '',
    description: result.description || '',
    domain: result.domain || new URL(finalUrl).hostname,
    favicon: result.favicon,
    image: result.image,
    pageType: computedPageType,
    published: result.published || '',
    redirectUrls: urls,
    resolvedUrl: finalUrl,
    site: result.site,
    source: targetUrl,
    title: result.title || '',
    url: finalUrl,
    urlType: computedPageType,
    wordCount: result.wordCount || 0,
  }
}

export type { LinkType } from './link-types'
export type { XtractResponse } from './xtract-response'
