import { spawn } from 'node:child_process'
import { cursor, screen } from './ansi.ts'
import type { ListParams, OtterClient } from './api.ts'
import { domain } from './format.ts'
import type { Key } from './keys.ts'
import { parseInput } from './keys.ts'
import type { AppState } from './state.ts'
import { initialState, TYPE_CYCLE } from './state.ts'
import { renderFrame, tagMatches, visibleItems } from './ui.ts'

const openInBrowser = (url: string) => {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]

  spawn(command, args as string[], { detached: true, stdio: 'ignore' })
    .on('error', () => {
      // opener missing — the URL stays visible in the UI either way
    })
    .unref()
}

export class App {
  client: OtterClient
  state: AppState
  private requestSeq = 0
  private input = process.stdin
  private output = process.stdout

  constructor(client: OtterClient) {
    this.client = client
    this.state = initialState()
  }

  start() {
    this.state.pageSize = visibleItems(this.output.rows || 24)
    this.output.write(screen.alt + cursor.hide + screen.clear)
    this.input.setRawMode(true)
    this.input.resume()
    this.input.setEncoding('utf8')
    this.input.on('data', (chunk) => {
      for (const key of parseInput(String(chunk))) {
        this.handleKey(key)
      }
    })
    this.output.on('resize', () => this.handleResize())
    void this.loadProfile()
    void this.fetchPage(0)
    this.render()
  }

  quit(): never {
    this.output.write(screen.main + cursor.show)
    this.input.setRawMode(false)
    this.input.pause()
    process.exit(0)
  }

  render() {
    this.output.write(
      renderFrame(
        this.state,
        this.output.columns || 80,
        this.output.rows || 24,
      ),
    )
  }

  private setStatus(status: string, kind: 'error' | 'info' = 'info') {
    this.state.status = status
    this.state.statusKind = kind
  }

  private async loadProfile() {
    try {
      const profile = await this.client.me()
      this.state.username = profile.username ?? ''
    } catch (error) {
      this.setStatus(
        `auth check failed: ${error instanceof Error ? error.message : error}`,
        'error',
      )
      this.render()
    }
  }

  async fetchPage(offset: number) {
    const seq = ++this.requestSeq
    const { state } = this
    state.loading = true
    this.render()

    try {
      const params: ListParams = {
        limit: state.pageSize,
        offset,
        star: state.starOnly || undefined,
        tag: state.tag ?? undefined,
        type: state.typeFilter ?? undefined,
      }
      const response = state.query
        ? await this.client.searchBookmarks(state.query, params)
        : await this.client.listBookmarks(params)

      if (seq !== this.requestSeq) {
        return
      }

      state.count = response.count
      state.items = response.data
      state.offset = offset
      state.selected = Math.max(
        0,
        Math.min(state.selected, response.data.length - 1),
      )
      state.loading = false
    } catch (error) {
      if (seq !== this.requestSeq) {
        return
      }

      state.loading = false
      this.setStatus(
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }

    this.render()
  }

  private handleResize() {
    const pageSize = visibleItems(this.output.rows || 24)

    if (pageSize !== this.state.pageSize) {
      this.state.pageSize = pageSize
      const offset = Math.floor(this.state.offset / pageSize) * pageSize
      void this.fetchPage(offset)
    }

    this.render()
  }

  private handleKey(key: Key) {
    if (key.ctrl && key.name === 'c') {
      this.quit()
    }

    switch (this.state.mode) {
      case 'list':
        this.handleListKey(key)
        break
      case 'search':
      case 'add':
        this.handleInputKey(key)
        break
      case 'confirm-delete':
        this.handleConfirmKey(key)
        break
      case 'detail':
        this.handleDetailKey(key)
        break
      case 'tags':
        this.handleTagsKey(key)
        break
      case 'help':
        this.state.mode = 'list'
        this.render()
        break
    }
  }

  private handleListKey(key: Key) {
    const char = key.name === 'char' ? key.char : undefined
    const { state } = this

    if (key.name === 'down' || char === 'j') {
      state.status = ''
      state.selected = Math.min(state.selected + 1, state.items.length - 1)
    } else if (key.name === 'up' || char === 'k') {
      state.status = ''
      state.selected = Math.max(state.selected - 1, 0)
    } else if (key.name === 'home' || char === 'g') {
      state.selected = 0
    } else if (key.name === 'end' || char === 'G') {
      state.selected = Math.max(0, state.items.length - 1)
    } else if (
      key.name === 'right' ||
      key.name === 'pagedown' ||
      char === 'l'
    ) {
      this.nextPage()
      return
    } else if (key.name === 'left' || key.name === 'pageup' || char === 'h') {
      this.previousPage()
      return
    } else if (key.name === 'enter' || char === 'o') {
      this.openSelected()
    } else if (char === '/') {
      state.mode = 'search'
      state.input = state.query
    } else if (char === 'a') {
      state.mode = 'add'
      state.input = ''
    } else if (char === 's') {
      void this.toggleStar()
      return
    } else if (char === 'd' && state.items.length) {
      state.mode = 'confirm-delete'
    } else if (char === 'f') {
      state.starOnly = !state.starOnly
      void this.fetchPage(0)
      return
    } else if (char === 'c') {
      this.cycleTypeFilter()
      return
    } else if (char === 't') {
      void this.openTagPicker()
      return
    } else if (char === 'x') {
      state.query = ''
      state.starOnly = false
      state.tag = null
      state.typeFilter = null
      void this.fetchPage(0)
      return
    } else if (char === 'r') {
      void this.fetchPage(state.offset)
      return
    } else if (char === 'i' && state.items.length) {
      state.mode = 'detail'
    } else if (char === '?') {
      state.mode = 'help'
    } else if (char === 'q') {
      this.quit()
    }

    this.render()
  }

  private handleInputKey(key: Key) {
    const { state } = this

    if (key.name === 'escape') {
      state.mode = 'list'
      state.input = ''
    } else if (key.name === 'enter') {
      if (state.mode === 'search') {
        state.query = state.input.trim()
        state.mode = 'list'
        void this.fetchPage(0)
        return
      }

      void this.submitAdd()
      return
    } else if (key.name === 'backspace') {
      state.input = Array.from(state.input).slice(0, -1).join('')
    } else if (key.ctrl && key.name === 'u') {
      state.input = ''
    } else if (key.name === 'char' && key.char) {
      state.input += key.char
    }

    this.render()
  }

  private handleConfirmKey(key: Key) {
    const confirmed =
      key.name === 'char' && (key.char === 'y' || key.char === 'Y')
    this.state.mode = 'list'

    if (confirmed) {
      void this.deleteSelected()
      return
    }

    this.render()
  }

  private handleDetailKey(key: Key) {
    const char = key.name === 'char' ? key.char : undefined
    const { state } = this

    if (key.name === 'escape' || char === 'i' || char === 'q') {
      state.mode = 'list'
    } else if (key.name === 'down' || char === 'j') {
      state.selected = Math.min(state.selected + 1, state.items.length - 1)
    } else if (key.name === 'up' || char === 'k') {
      state.selected = Math.max(state.selected - 1, 0)
    } else if (key.name === 'enter' || char === 'o') {
      this.openSelected()
    } else if (char === 's') {
      void this.toggleStar()
      return
    }

    this.render()
  }

  private handleTagsKey(key: Key) {
    const { state } = this

    if (key.name === 'escape') {
      state.mode = 'list'
    } else if (key.name === 'enter') {
      const matches = tagMatches(state.tags, state.tagInput)
      const chosen = matches[state.tagCursor]
      state.mode = 'list'

      if (chosen) {
        state.tag = chosen.tag
        void this.fetchPage(0)
        return
      }
    } else if (key.name === 'down') {
      const matches = tagMatches(state.tags, state.tagInput)
      state.tagCursor = Math.min(state.tagCursor + 1, matches.length - 1)
    } else if (key.name === 'up') {
      state.tagCursor = Math.max(state.tagCursor - 1, 0)
    } else if (key.name === 'backspace') {
      state.tagInput = state.tagInput.slice(0, -1)
      state.tagCursor = 0
    } else if (key.name === 'char' && key.char) {
      state.tagInput += key.char
      state.tagCursor = 0
    }

    this.render()
  }

  private nextPage() {
    const { state } = this

    if (state.offset + state.pageSize < state.count) {
      state.selected = 0
      void this.fetchPage(state.offset + state.pageSize)
    }
  }

  private previousPage() {
    const { state } = this

    if (state.offset > 0) {
      state.selected = 0
      void this.fetchPage(Math.max(0, state.offset - state.pageSize))
    }
  }

  private cycleTypeFilter() {
    const { state } = this
    const index = TYPE_CYCLE.indexOf(
      state.typeFilter as (typeof TYPE_CYCLE)[number],
    )
    state.typeFilter = TYPE_CYCLE[(index + 1) % TYPE_CYCLE.length] ?? null
    void this.fetchPage(0)
  }

  private async openTagPicker() {
    const { state } = this
    state.mode = 'tags'
    state.tagCursor = 0
    state.tagInput = ''
    this.render()

    try {
      state.tags = await this.client.tags()
    } catch (error) {
      state.mode = 'list'
      this.setStatus(
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }

    this.render()
  }

  private openSelected() {
    const bookmark = this.state.items[this.state.selected]

    if (!bookmark?.url) {
      this.setStatus('selected bookmark has no URL', 'error')
      return
    }

    openInBrowser(bookmark.url)
    bookmark.click_count += 1
    this.client.registerClick(bookmark.id).catch(() => {
      // click tracking is best-effort
    })
    this.setStatus(`opened ${domain(bookmark.url) || bookmark.url}`)
  }

  private async toggleStar() {
    const bookmark = this.state.items[this.state.selected]

    if (!bookmark) {
      return
    }

    bookmark.star = !bookmark.star
    this.render()

    try {
      await this.client.updateBookmark(bookmark.id, { star: bookmark.star })
      this.setStatus(bookmark.star ? '★ starred' : 'unstarred')
    } catch (error) {
      bookmark.star = !bookmark.star
      this.setStatus(
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }

    this.render()
  }

  private async deleteSelected() {
    const { state } = this
    const bookmark = state.items[state.selected]

    if (!bookmark) {
      return
    }

    this.setStatus('deleting…')
    this.render()

    try {
      await this.client.deleteBookmark(bookmark.id)
      this.setStatus(
        `deleted “${bookmark.title || bookmark.url || bookmark.id}”`,
      )
      const offset =
        state.items.length === 1 && state.offset > 0
          ? Math.max(0, state.offset - state.pageSize)
          : state.offset
      await this.fetchPage(offset)
    } catch (error) {
      this.setStatus(
        error instanceof Error ? error.message : String(error),
        'error',
      )
      this.render()
    }
  }

  private async submitAdd() {
    const { state } = this
    const raw = state.input.trim()
    state.mode = 'list'
    state.input = ''

    if (!raw) {
      this.render()
      return
    }

    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
    this.setStatus(`saving ${url}…`)
    state.loading = true
    this.render()

    try {
      const [saved] = await this.client.addBookmark(url)
      state.loading = false
      this.setStatus(`saved “${saved?.title || url}”`)
      await this.fetchPage(0)
    } catch (error) {
      state.loading = false
      this.setStatus(
        error instanceof Error ? error.message : String(error),
        'error',
      )
      this.render()
    }
  }
}
