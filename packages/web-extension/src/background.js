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

const onContextClick = async (info, tab) => {
  try {
    if (info.linkUrl) {
      openBookmarkletPage(info.linkUrl)
    } else {
      openBookmarkletPage(tab.url)
    }
  } catch (err) {
    console.log(`🚀 ~ onContextClick ~ save ~ onCommand.addListener ~ err`, err)
  }
}

browserAPI.action.onClicked.addListener(async (tab) => {
  if ((await isOptionsSetup()) === false) {
    console.info('options not setup')
    browserAPI.tabs.create({ url: browserAPI.runtime.getURL('options.html') })
    return
  }

  openBookmarkletPage(tab.url)
})

browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  onContextClick(info, tab)
})

/**
 * FIXME or change
 * Perhaps use [chrome.tabs.onActivated](https://developer.chrome.com/docs/extensions/reference/tabs/#event-onActivated)
 * or render something on the page instead. would need content script for that.
 * still need a reliable to to check the active tab has already been saved in Otter and
 * for the check to be run every time a new tab is opened/updated
 */
browserAPI.webNavigation.onCompleted.addListener(async (details) => {
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
 * Context menus
 */
// chrome.contextMenus.create({
//   title: '🦦 Quick save to Otter',
//   contexts: ['page', 'link'],
//   id: 'otter-context-quick-save',
// });

browserAPI.contextMenus.create({
  contexts: ['page', 'link'],
  id: 'otter-context-save',
  title: 'Save to Otter',
})
