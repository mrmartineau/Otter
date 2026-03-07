import { DOMParser, parseHTML } from 'linkedom'

// Turndown's browser build checks for window.DOMParser at module load time.
// Provide it from linkedom so turndown can parse HTML strings in Workers.
const g = globalThis as any
if (!g.DOMParser) {
  g.DOMParser = DOMParser
}
if (!g.window) {
  g.window = g
}
if (!g.document) {
  const { document } = parseHTML('')
  g.document = document
}
if (!g.Node) {
  g.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  }
}
if (!g.getComputedStyle) {
  g.getComputedStyle = () => ({ display: '' })
}
