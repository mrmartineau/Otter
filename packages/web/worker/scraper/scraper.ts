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

// Tags whose content should be excluded from markdown output
const MARKDOWN_SKIP_TAGS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'noscript',
  'iframe',
  'button',
  'form',
  'select',
  'option',
  'svg',
  'figure',
  'figcaption',
]

class Scraper {
  rewriter: HTMLRewriter
  url: string = ''
  response!: Response
  metadata!: ScrapeResponse
  unshortenedInfo!: FollowShortUrlResponse
  private markdownClone: Response | null = null

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

    // Clone the response so we can use it for both metadata and markdown extraction
    this.markdownClone = this.response.clone()

    return this.response
  }

  async getMetadata(
    options: GetMetadataOptions[],
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

      for (const item of optionsItem.selectors) {
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

  async getMarkdown(): Promise<string | null> {
    if (!this.markdownClone) return null

    const parts: string[] = []

    const state = {
      skipDepth: 0,
      blockText: '',
      headingLevel: 0,
      inPre: false,
      linkHref: '',
      linkText: '',
      inLink: false,
      listStyle: null as 'ul' | 'ol' | null,
      listCounter: 0,
    }

    const flushBlock = (prefix = '', suffix = '') => {
      const text = state.blockText.trim()
      if (text) parts.push(prefix + text + suffix)
      state.blockText = ''
    }

    const rewriter = new HTMLRewriter()

    // Skip noisy elements — increment a depth counter so nested skip-tags work correctly
    for (const tag of MARKDOWN_SKIP_TAGS) {
      rewriter.on(tag, {
        element(el) {
          state.skipDepth++
          el.onEndTag(() => {
            state.skipDepth--
          })
        },
      })
    }

    // Headings h1–h6
    for (let i = 1; i <= 6; i++) {
      const level = i
      const prefix = `${'#'.repeat(level)} `
      rewriter.on(`h${i}`, {
        element(el) {
          if (state.skipDepth > 0) return
          state.headingLevel = level
          state.blockText = ''
          el.onEndTag(() => {
            if (state.headingLevel === level) {
              flushBlock(prefix)
              state.headingLevel = 0
            }
          })
        },
        text(t) {
          if (state.skipDepth > 0 || state.headingLevel !== level) return
          if (state.inLink) {
            state.linkText += t.text
          } else {
            state.blockText += t.text
          }
        },
      })
    }

    // Paragraphs
    rewriter.on('p', {
      element(el) {
        if (state.skipDepth > 0 || state.headingLevel > 0 || state.inPre)
          return
        state.blockText = ''
        el.onEndTag(() => {
          if (state.headingLevel === 0 && !state.inPre) flushBlock()
        })
      },
      text(t) {
        if (state.skipDepth > 0 || state.headingLevel > 0 || state.inPre)
          return
        if (state.inLink) {
          state.linkText += t.text
        } else {
          state.blockText += t.text
        }
      },
    })

    // Links — capture href and wrap text in markdown link syntax on close
    rewriter.on('a', {
      element(el) {
        if (state.skipDepth > 0) return
        const href = el.getAttribute('href')
        if (
          href &&
          !href.startsWith('#') &&
          !href.startsWith('javascript:')
        ) {
          state.inLink = true
          state.linkHref = href
          state.linkText = ''
        }
        el.onEndTag(() => {
          if (state.inLink) {
            const text = state.linkText.trim()
            state.blockText += text
              ? `[${text}](${state.linkHref})`
              : state.linkHref
            state.inLink = false
            state.linkHref = ''
            state.linkText = ''
          }
        })
      },
    })

    // Unordered lists
    rewriter.on('ul', {
      element(el) {
        if (state.skipDepth > 0) return
        state.listStyle = 'ul'
        el.onEndTag(() => {
          state.listStyle = null
        })
      },
    })

    // Ordered lists
    rewriter.on('ol', {
      element(el) {
        if (state.skipDepth > 0) return
        state.listStyle = 'ol'
        state.listCounter = 0
        el.onEndTag(() => {
          state.listStyle = null
          state.listCounter = 0
        })
      },
    })

    // List items
    rewriter.on('li', {
      element(el) {
        if (state.skipDepth > 0) return
        if (state.listStyle === 'ol') state.listCounter++
        const counter = state.listCounter
        const ls = state.listStyle
        state.blockText = ''
        el.onEndTag(() => {
          const prefix = ls === 'ol' ? `${counter}. ` : '- '
          flushBlock(prefix)
        })
      },
      text(t) {
        if (state.skipDepth > 0) return
        if (state.inLink) {
          state.linkText += t.text
        } else {
          state.blockText += t.text
        }
      },
    })

    // Code blocks — preserve whitespace, wrap in fenced code block
    rewriter.on('pre', {
      element(el) {
        if (state.skipDepth > 0) return
        state.inPre = true
        state.blockText = ''
        el.onEndTag(() => {
          flushBlock('```\n', '\n```')
          state.inPre = false
        })
      },
      text(t) {
        if (state.skipDepth > 0 || !state.inPre) return
        state.blockText += t.text
      },
    })

    // Blockquotes
    rewriter.on('blockquote', {
      element(el) {
        if (state.skipDepth > 0) return
        state.blockText = ''
        el.onEndTag(() => flushBlock('> '))
      },
      text(t) {
        if (state.skipDepth > 0) return
        if (state.inLink) {
          state.linkText += t.text
        } else {
          state.blockText += t.text
        }
      },
    })

    try {
      await rewriter.transform(this.markdownClone).arrayBuffer()
    } catch (error) {
      console.error('Error extracting markdown:', error)
      return null
    }

    const markdown = parts.join('\n\n').trim()
    return markdown || null
  }
}

export default Scraper
