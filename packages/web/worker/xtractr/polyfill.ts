import { DOMParser, parseHTML } from 'linkedom'

// Turndown checks for browser globals at module-load time.
// Ensure they are initialized as soon as this module is loaded.
let initialized = false

export function ensurePolyfills() {
  if (initialized) return
  initialized = true

  const g = globalThis
  const mutableGlobal = globalThis as Record<string, unknown>

  if (!g.DOMParser) {
    mutableGlobal.DOMParser = DOMParser
  }
  if (!g.window) {
    mutableGlobal.window = globalThis as Window & typeof globalThis
  }
  if (!g.document) {
    const { document } = parseHTML('')
    mutableGlobal.document = document
  }
  if (!g.Node) {
    mutableGlobal.Node = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
    }
  }
  if (!g.getComputedStyle) {
    mutableGlobal.getComputedStyle = () =>
      ({ display: '' }) as CSSStyleDeclaration
  }
}

ensurePolyfills()
