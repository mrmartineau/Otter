import { decode } from 'html-entities'
import type { ScrapeResponse } from '.'
import { type FollowShortUrlResponse, followShortUrl } from './follow-short-url'
import { generateErrorJSONResponse } from './json-response'
import { randomUserAgent } from './randomUserAgent'

const cleanText = (string: string) => decode(string.trim(), { level: 'html5' })

type GetValueOption = { selector: string; attribute?: string }
export type GetMetadataOptions = {
  name: string
  selectors: GetValueOption[]
  multiple: boolean
}

class Scraper {
  rewriter: HTMLRewriter
  url: string = ''
  response!: Response
  metadata!: ScrapeResponse
  unshortenedInfo!: FollowShortUrlResponse

  constructor() {
    this.rewriter = new HTMLRewriter()
  }

  private validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  async fetch(url: string): Promise<Response> {
    if (!this.validateUrl(url)) {
      return generateErrorJSONResponse(new Error('Invalid URL provided'), url)
    }

    this.url = url
    try {
      this.unshortenedInfo = await followShortUrl([url])
    } catch (error) {
      console.log(`🚀 ~ Scraper ~ fetch ~ error:`, error)
      return generateErrorJSONResponse(error, url)
    }

    const targetUrl = this.unshortenedInfo.unshortened_url || url

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      this.response = await fetch(targetUrl, {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          referrer: 'http://www.google.com/',
          'User-Agent':
            randomUserAgent() || 'Mozilla/5.0 (compatible; OtterBot/1.0)',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const server = this.response.headers.get('server')

    const isThisWorkerErrorNotErrorWithinScrapedSite =
      [530, 503, 502, 403, 400].includes(this.response.status) &&
      (server === 'cloudflare' || !server) /* Workers preview editor */

    if (isThisWorkerErrorNotErrorWithinScrapedSite) {
      throw new Error(`Status ${this.response.status} requesting ${url}`)
    }

    return this.response
  }

  async getMetadata(
    options: GetMetadataOptions[]
  ): Promise<Record<string, string | string[]>> {
    const matches: Record<string, string | string[]> = {}
    const selectedSelectors: Record<string, boolean> = {}

    for (const optionsItem of options) {
      const name = optionsItem.name
      const isMultiple = optionsItem.multiple

      if (!matches[name]) {
        if (isMultiple) {
          matches[name] = []
        } else {
          matches[name] = ''
        }
      }

      for await (const item of optionsItem.selectors) {
        const selector = item.selector
        let nextText = ''

        if (selectedSelectors[name]) {
          break
        }

        this.rewriter.on(selector, {
          element(element: Element) {
            if (item.attribute) {
              // Get attribute content value
              const attrText = element.getAttribute(item.attribute)
              if (attrText) {
                nextText = attrText

                // If multiple, push to array, otherwise set as string
                if (isMultiple) {
                  const matchesArray = matches[name] as string[]
                  if (Array.isArray(matchesArray)) {
                    matchesArray.push(cleanText(nextText))
                  }
                } else {
                  if (matches[name] === '') {
                    matches[name] = cleanText(nextText)
                    selectedSelectors[name] = true
                  }
                }
              }
            } else {
              nextText = ''
            }
          },
          text(text) {
            // Get text content value
            if (!item.attribute) {
              nextText += text.text

              if (text.lastInTextNode) {
                // If multiple, push to array, otherwise set as string
                if (isMultiple) {
                  const matchesArray = matches[name] as string[]
                  if (Array.isArray(matchesArray)) {
                    matchesArray.push(cleanText(nextText))
                  }
                } else {
                  if (matches[name] === '') {
                    matches[name] = cleanText(nextText)
                    selectedSelectors[name] = true
                  }
                }
                nextText = ''
              }
            }
          },
        })
      }
    }

    try {
      const transformed = this.rewriter.transform(this.response)
      await transformed.arrayBuffer()
    } catch (error) {
      console.error('Error transforming HTML:', error)
      // Return empty matches if transformation fails
      return {}
    }

    return matches
  }
}

export default Scraper
