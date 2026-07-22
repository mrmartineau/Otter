import type { Bookmark, TagCount } from './api.ts'

export type Mode =
  | 'add'
  | 'confirm-delete'
  | 'detail'
  | 'help'
  | 'list'
  | 'search'
  | 'tags'

export interface AppState {
  count: number
  /** text buffer for search/add input modes */
  input: string
  items: Bookmark[]
  loading: boolean
  mode: Mode
  offset: number
  pageSize: number
  query: string
  selected: number
  starOnly: boolean
  status: string
  statusKind: 'error' | 'info'
  tag: string | null
  tagCursor: number
  tagInput: string
  tags: TagCount[]
  typeFilter: string | null
}

export const initialState = (): AppState => ({
  count: 0,
  input: '',
  items: [],
  loading: true,
  mode: 'list',
  offset: 0,
  pageSize: 10,
  query: '',
  selected: 0,
  starOnly: false,
  status: '',
  statusKind: 'info',
  tag: null,
  tagCursor: 0,
  tagInput: '',
  tags: [],
  typeFilter: null,
})

/** Bookmark types the `c` key cycles through (subset of the API's types). */
export const TYPE_CYCLE = [
  null,
  'article',
  'link',
  'video',
  'audio',
  'recipe',
  'image',
  'document',
  'note',
] as const
