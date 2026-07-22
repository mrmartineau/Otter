import type { LinkType } from './link-types'

export type DefuddleCompatDocument = Document & {
  styleSheets?: unknown
  defaultView?: (Window & typeof globalThis) | null
}

export interface DefuddleMetaTag {
  name?: string | null
  property?: string | null
  content?: string | null
}

export type DefuddleSchemaOrgItem = Record<string, unknown>

export interface XtractResponse {
  title: string
  author: string
  published: string
  description: string
  domain: string
  content: string
  wordCount: number
  source: string
  url: string
  resolvedUrl: string
  redirectUrls: string[]
  urlType: LinkType
  pageType: LinkType
  favicon?: string
  image?: string
  site?: string
}
