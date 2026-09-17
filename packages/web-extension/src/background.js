import urlJoin from 'proper-url-join'
import { browserAPI } from './browser-api.js'
import { getStorageItems } from './getStorageItems'

let screenWidth
let screenHeight

// Cross-browser screen dimensions
const getScreenDimensions = async () => {
  try {
    // Chrome: Use system.display API
    if (browserAPI.system && browserAPI.system.display) {
      const info = await browserAPI.system.display.getInfo()
      return {
        height: info[0].bounds.height,
        width: info[0].bounds.width,
      }
    }
    // Firefox: Use screen API through content script or fallback
    const tabs = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (tabs[0]) {
      try {
        const results = await browserAPI.tabs.executeScript(tabs[0].id, {
          code: `({
            width: window.screen.width,
            height: window.screen.height
          })`,
        })
        return results[0]
      } catch (err) {
        console.warn(
          'Could not get screen dimensions from content script:',
          err,
        )
      }
    }
    // Fallback dimensions
    return { height: 1080, width: 1920 }
  } catch (error) {
    console.warn('Error getting screen dimensions:', error)
    return { height: 1080, width: 1920 }
  }
}

// Initialize screen dimensions
getScreenDimensions().then((dimensions) => {
  screenWidth = dimensions.width
  screenHeight = dimensions.height
})

const isOptionsSetup = async () => {
  try {
    const { otterInstanceUrl } = await getStorageItems()
    if (!otterInstanceUrl) {
      throw new Error('Missing otterInstanceUrl')
    }
    return true
  } catch (err) {
    return false
  }
}

const openBookmarkletPage = async (url) => {
  const { otterInstanceUrl, newBookmarkWindowBehaviour } =
    await getStorageItems()
  // create new bookmark
  if (newBookmarkWindowBehaviour === 'tab') {
    browserAPI.tabs.create({
      url: urlJoin(otterInstanceUrl, 'new', 'bookmark', {
        query: {
          bookmarklet: 'true',
          url,
        },
      }),
    })
  } else {
    const posX = Math.round((screenWidth - 730) / 2)
    const posY = Math.round((screenHeight - 800) / 2)
    browserAPI.windows.create({
      height: 800,
      left: posX,
      top: posY,
      type: 'panel',
      url: urlJoin(otterInstanceUrl, 'new', 'bookmark', {
        query: {
          bookmarklet: 'true',
          url,
        },
      }),
      width: 500,
    })
  }
}

// Some Chromium-based browsers (e.g. Phi Browser) don't expose the MV3
// `action` API and only provide the legacy `browserAction` API
const actionAPI = browserAPI.action ?? browserAPI.browserAction

/**
 * Direct API saves, using the Otter session already in this browser. The
 * user is signed in to the web app; host permissions let the cookie travel.
 */
const apiSave = async (kind, url, title) => {
  const { otterInstanceUrl } = await getStorageItems()
  const endpoint =
    kind === 'read-later'
      ? urlJoin(otterInstanceUrl, 'api', 'reader', 'items')
      : urlJoin(otterInstanceUrl, 'api', 'new')
  // /api/new scrapes title, description, image and type (article, video…)
  // and matches existing tags. /api/reader/items extracts the article.
  const body = kind === 'read-later' ? { url } : [{ scrape: true, title, url }]

  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (response.status === 401) {
    throw new Error('Sign in to Otter in this browser first.')
  }
  if (!response.ok) {
    let reason = `Otter returned ${response.status}.`
    try {
      const payload = await response.json()
      reason = payload.error ?? payload.reason ?? reason
    } catch {}
    throw new Error(reason)
  }
}

const flashBadge = (text) => {
  actionAPI.setBadgeText({ text })
  setTimeout(() => actionAPI.setBadgeText({ text: '' }), 2000)
}

/**
 * One entry point for the popup, the context menu and the shortcuts.
 * `bookmark` opens the full form; the other two save straight away.
 */
const save = async (kind, url, title) => {
  if ((await isOptionsSetup()) === false) {
    browserAPI.tabs.create({ url: browserAPI.runtime.getURL('options.html') })
    return { error: 'Set your Otter address first.', ok: false }
  }

  if (kind === 'bookmark') {
    openBookmarkletPage(url)
    return { ok: true }
  }

  try {
    await apiSave(kind, url, title)
    flashBadge('✓')
    return { ok: true }
  } catch (error) {
    flashBadge('!')
    return { error: error.message, ok: false }
  }
}

browserAPI.runtime.onMessage.addListener((message) => {
  if (['quick-save', 'read-later', 'bookmark'].includes(message?.type)) {
    return save(message.type, message.url, message.title)
  }
})

// Fallback for browsers that ignore `default_popup`.
actionAPI.onClicked?.addListener(async (tab) => {
  save('bookmark', tab.url)
})

browserAPI.commands?.onCommand.addListener(async (command, tab) => {
  const active =
    tab ??
    (await browserAPI.tabs.query({ active: true, currentWindow: true }))[0]
  if (!active?.url) return

  if (command === 'quick-save') save('quick-save', active.url, active.title)
  if (command === 'read-later') save('read-later', active.url, active.title)
})

const contextKinds = {
  'otter-context-quick-save': 'quick-save',
  'otter-context-read-later': 'read-later',
  'otter-context-save': 'bookmark',
}

browserAPI.contextMenus?.onClicked.addListener((info, tab) => {
  const kind = contextKinds[info.menuItemId]
  if (!kind) return

  // On a link, the tab's title belongs to the page the link sits on, not to
  // the link's target, so it only helps as a fallback for the page itself.
  if (info.linkUrl) {
    save(kind, info.linkUrl)
  } else {
    save(kind, tab.url, tab.title)
  }
})

/**
 * FIXME or change
 * Perhaps use [chrome.tabs.onActivated](https://developer.chrome.com/docs/extensions/reference/tabs/#event-onActivated)
 * or render something on the page instead. would need content script for that.
 * still need a reliable to to check the active tab has already been saved in Otter and
 * for the check to be run every time a new tab is opened/updated
 */
browserAPI.webNavigation?.onCompleted.addListener(async (details) => {
  if ((await isOptionsSetup()) === false) {
    return
  }

  // not sure if this works so removing for now
  /* try {
    const response = await checkUrl(details.url);
    console.log(
      `🚀 ~ browserAPI.webNavigation.onCompleted.addListener ~ response`,
      response
    );
    const { isSaved, data } = response;
    console.log(`🚀 ~ browserAPI.webNavigation.onCompleted.addListener ~ data`, {
      isSaved,
      data,
    });

    if (isSaved) {
      browserAPI.action.setBadgeText({
        text: '🟢',
      });
    }
  } catch (err) {
    console.log(`🚀 ~ browserAPI.webNavigation.onCompleted.addListener ~ err`, err);
  } */
})

/**
 * Context menus: the same three actions as the popup, on pages and links.
 *
 * An MV3 service worker is torn down when idle and re-runs this file every
 * time it wakes, so creating the menus at the top level throws "Cannot create
 * item with duplicate id" on the second wake. Register them on install and on
 * browser start instead, clearing first so the call is safe to repeat.
 */
const contextMenuItems = [
  { id: 'otter-context-quick-save', title: 'Quick save to Otter' },
  { id: 'otter-context-read-later', title: 'Read later in Otter' },
  { id: 'otter-context-save', title: 'Save to Otter with details…' },
]

/**
 * `contextMenus.create` is one of the few APIs the polyfill leaves on Chrome's
 * callback style: it returns the id synchronously and reports failure through
 * `runtime.lastError`. Passing a callback that reads that value marks the error
 * as handled — without it a duplicate id logs "Unchecked runtime.lastError".
 */
const createMenuItem = (item) =>
  browserAPI.contextMenus.create(
    { contexts: ['page', 'link'], ...item },
    () => {
      const error = browserAPI.runtime.lastError

      if (error) {
        console.warn(`Context menu ${item.id}: ${error.message}`)
      }
    },
  )

// Rebuilds are serialised: onInstalled and onStartup can both fire when the
// browser starts just after an update, and two interleaved rebuilds would
// clear each other's menus and then collide on the same ids.
let contextMenuRebuild = Promise.resolve()

const createContextMenus = () => {
  if (!browserAPI.contextMenus) {
    return contextMenuRebuild
  }

  contextMenuRebuild = contextMenuRebuild
    .then(async () => {
      await browserAPI.contextMenus.removeAll()

      for (const item of contextMenuItems) {
        createMenuItem(item)
      }
    })
    .catch((error) => {
      console.warn('Could not create context menus:', error)
    })

  return contextMenuRebuild
}

browserAPI.runtime.onInstalled.addListener(createContextMenus)
browserAPI.runtime.onStartup?.addListener(createContextMenus)
