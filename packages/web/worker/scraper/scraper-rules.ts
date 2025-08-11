import type { GetMetadataOptions } from './scraper'

/**
 * Scraper rules
 * For each rule, the first selector that matches will be used
 */
export const scraperRules: GetMetadataOptions[] = [
  {
    multiple: false,
    name: 'title',
    selectors: [
      { attribute: 'content', selector: 'meta[name="og:title"]' },
      { attribute: 'content', selector: 'meta[property="og:title"]' },
      { attribute: 'content', selector: 'meta[name=title]' },
      { attribute: 'content', selector: 'meta[name="twitter:title"]' },
      { attribute: 'content', selector: 'meta[property="twitter:title"]' },
      { selector: 'title' },
      { selector: 'h1[slot="title"]' },
      { selector: '.post-title' },
      { selector: '.entry-title' },
      { selector: 'h1[class*="title" i] a' },
      { selector: 'h1[class*="title" i]' },
    ],
  },
  {
    multiple: false,
    name: 'description',
    selectors: [
      { selector: 'status-body' },
      { attribute: 'content', selector: 'meta[name="og:description"]' },
      { attribute: 'content', selector: 'meta[property="og:description"]' },
      {
        attribute: 'content',
        selector: 'meta[name="twitter:description"]',
      },
      {
        attribute: 'content',
        selector: 'meta[property="twitter:description"]',
      },
      { attribute: 'content', selector: 'meta[itemprop="description"]' },
      { attribute: 'content', selector: 'meta[name="description"]' },
    ],
  },
  {
    multiple: false,
    name: 'author',
    selectors: [
      { attribute: 'href', selector: 'link[rel=author]' },
      { attribute: 'content', selector: 'meta[name="author"]' },
      { attribute: 'content', selector: 'meta[name="article:author"]' },
      { attribute: 'content', selector: 'meta[property="article:author"]' },
      { selector: '[itemprop*="author" i] [itemprop="name"]' },
    ],
  },
  {
    multiple: false,
    name: 'image',
    selectors: [
      {
        attribute: 'href',
        selector: 'link[rel="image_src"]',
      },
      { attribute: 'content', selector: 'meta[name="og:image"]' },
      { attribute: 'content', selector: 'meta[property="og:image"]' },
      { attribute: 'content', selector: 'meta[name="og:image:url"]' },
      { attribute: 'content', selector: 'meta[property="og:image:url"]' },
      {
        attribute: 'content',
        selector: 'meta[name="og:image:secure_url"]',
      },
      {
        attribute: 'content',
        selector: 'meta[property="og:image:secure_url"]',
      },
      { attribute: 'content', selector: 'meta[name="twitter:image:src"]' },
      {
        attribute: 'content',
        selector: 'meta[property="twitter:image:src"]',
      },
      { attribute: 'content', selector: 'meta[name="twitter:image"]' },
      { attribute: 'content', selector: 'meta[property="twitter:image"]' },
      { attribute: 'content', selector: 'meta[itemprop="image"]' },
    ],
  },
  {
    multiple: true,
    name: 'feeds',
    selectors: [
      {
        attribute: 'href',
        selector: 'link[type="application/rss+xml"]',
      },
      { attribute: 'href', selector: 'link[type="application/feed+json"]' },
      { attribute: 'href', selector: 'link[type="application/atom+xml"]' },
    ],
  },
  {
    multiple: false,
    name: 'date',
    selectors: [
      { attribute: 'content', selector: 'meta[name="date" i]' },
      { attribute: 'content', selector: '[itemprop*="date" i]' },
      { attribute: 'datetime', selector: 'time[itemprop*="date" i]' },
      { attribute: 'datetime', selector: 'time[datetime]' },
      { selector: 'time' },
    ],
  },
  {
    multiple: false,
    name: 'lang',
    selectors: [
      { attribute: 'content', selector: 'meta[name="og:locale"]' },
      { attribute: 'content', selector: 'meta[property="og:locale"]' },
      { attribute: 'content', selector: 'meta[itemprop="inLanguage"]' },
      { attribute: 'lang', selector: 'html' },
    ],
  },
  {
    multiple: false,
    name: 'logo',
    selectors: [
      { attribute: 'content', selector: 'meta[name="og:logo"]' },
      { attribute: 'content', selector: 'meta[property="og:logo"]' },
      { attribute: 'content', selector: 'meta[itemprop="logo"]' },
      { attribute: 'src', selector: 'img[itemprop="logo"]' },
      {
        attribute: 'href',
        selector: 'link[rel="apple-touch-icon-precomposed"]',
      },
    ],
  },
  {
    multiple: false,
    name: 'video',
    selectors: [
      {
        attribute: 'content',
        selector: 'meta[name="og:video:secure_url"]',
      },
      {
        attribute: 'content',
        selector: 'meta[property="og:video:secure_url"]',
      },
      { attribute: 'content', selector: 'meta[name="og:video:url"]' },
      { attribute: 'content', selector: 'meta[property="og:video:url"]' },
      { attribute: 'content', selector: 'meta[name="og:video"]' },
      { attribute: 'content', selector: 'meta[property="og:video"]' },
    ],
  },
  {
    multiple: false,
    name: 'keywords',
    selectors: [
      {
        attribute: 'content',
        selector: 'meta[name="keywords"]',
      },
    ],
  },
  {
    multiple: false,
    name: 'jsonld',
    selectors: [
      {
        selector: '#content #microformat script[type="application/ld+json"]',
      },
      {
        selector:
          'ytd-player-microformat-renderer script[type="application/ld+json"]',
      },
      {
        selector: 'script[type="application/ld+json"]',
      },
    ],
  },
]
