/**
 * Runs the built background bundle against a stub Chrome and proves the
 * context menus survive the things that broke them:
 *
 *  1. A service-worker wake (the file is evaluated again) must not create
 *     menus — that produced "Cannot create item with duplicate id".
 *  2. onInstalled and onStartup firing together must still leave exactly one
 *     menu per id, with no unchecked runtime.lastError.
 *
 * Run: node test/context-menus.check.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'

const bundle = readFileSync(
  join(import.meta.dirname, '..', 'dist', 'chrome', 'background.js'),
  'utf8',
)

const makeChrome = () => {
  const menus = new Map()
  const listeners = { onInstalled: [], onStartup: [] }
  const unchecked = []
  let lastError

  const event = (name) => ({
    addListener: (fn) => listeners[name]?.push(fn),
  })

  const chrome = {
    action: { onClicked: event('noop'), setBadgeText: () => {} },
    commands: { onCommand: event('noop') },
    contextMenus: {
      create(props, callback) {
        if (menus.has(props.id)) {
          lastError = {
            message: `Cannot create item with duplicate id ${props.id}`,
          }
        } else {
          menus.set(props.id, props)
          lastError = undefined
        }

        if (callback) {
          callback()
        } else if (lastError) {
          // Exactly what Chrome logs when nobody reads lastError.
          unchecked.push(lastError.message)
        }

        lastError = undefined
        return props.id
      },
      onClicked: event('noop'),
      removeAll(callback) {
        menus.clear()
        callback?.()
      },
    },
    runtime: {
      getURL: (path) => `chrome-extension://stub/${path}`,
      id: 'stub-extension',
      get lastError() {
        return lastError
      },
      onInstalled: event('onInstalled'),
      onMessage: event('noop'),
      onStartup: event('onStartup'),
      openOptionsPage: () => {},
    },
    storage: { sync: { get: async () => ({}) } },
    system: { display: { getInfo: async () => [{ bounds: {} }] } },
    tabs: { create: () => {}, query: async () => [] },
    webNavigation: { onCompleted: event('noop') },
    windows: { create: () => {} },
  }

  // Events the bundle registers but this check doesn't drive.
  listeners.noop = []

  return { chrome, listeners, menus, unchecked }
}

/** Evaluates the bundle, as the browser does on every service-worker wake. */
const wake = (context) =>
  vm.runInNewContext(bundle, {
    chrome: context.chrome,
    console: { error() {}, info() {}, log() {}, warn() {} },
    fetch: async () => ({ ok: true, status: 200 }),
    setTimeout,
    URL,
  })

// 1. A wake on its own must not touch the menus.
const first = makeChrome()
wake(first)
assert.equal(first.menus.size, 0, 'a wake must not create menus at top level')

// 2. Install, then two more wakes: still no duplicate-id errors.
for (const listener of first.listeners.onInstalled) await listener()
assert.equal(first.menus.size, 3, 'install should create three menus')
wake(first)
wake(first)
assert.equal(first.menus.size, 3, 'later wakes must not add menus')
assert.deepEqual(first.unchecked, [], 'no unchecked runtime.lastError')

// 3. onInstalled and onStartup racing must not collide or drop menus.
const second = makeChrome()
wake(second)
await Promise.all([
  ...second.listeners.onInstalled.map((fn) => fn()),
  ...second.listeners.onStartup.map((fn) => fn()),
])
assert.equal(second.menus.size, 3, 'a racing rebuild should leave three menus')
assert.deepEqual(second.unchecked, [], 'no unchecked error during a race')
assert.deepEqual(
  [...second.menus.keys()].sort(),
  [
    'otter-context-quick-save',
    'otter-context-read-later',
    'otter-context-save',
  ],
  'all three actions are present',
)

console.log('context menu checks passed')
