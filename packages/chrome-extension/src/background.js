import urlJoin from 'proper-url-join'
import { getStorageItems } from './getStorageItems'

let screenWidth
let screenHeight
chrome.system.display.getInfo((info) => {
  screenWidth = info[0].bounds.width
  screenHeight = info[0].bounds.height
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
    chrome.tabs.create({
      url: urlJoin(otterInstanceUrl, 'new', 'bookmark', {
        query: {
          bookmarklet: 'true',
          url,
        },
      }),
    })
  } else {
    const posX = (screenWidth - 730) / 2
    const posY = (screenHeight - 800) / 2
    chrome.windows.create({
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

chrome.action.onClicked.addListener(async (tab) => {
  if ((await isOptionsSetup()) === false) {
    console.info('options not setup')
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
    return
  }

  openBookmarkletPage(tab.url)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  onContextClick(info, tab)
})

/**
 * FIXME or change
 * Perhaps use [chrome.tabs.onActivated](https://developer.chrome.com/docs/extensions/reference/tabs/#event-onActivated)
 * or render something on the page instead. would need content script for that.
 * still need a reliable to to check the active tab has already been saved in Otter and
 * for the check to be run every time a new tab is opened/updated
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if ((await isOptionsSetup()) === false) {
    return
  }

  // not sure if this works so removing for now
  /* try {
    const response = await checkUrl(details.url);
    console.log(
      `🚀 ~ chrome.webNavigation.onCompleted.addListener ~ response`,
      response
    );
    const { isSaved, data } = response;
    console.log(`🚀 ~ chrome.webNavigation.onCompleted.addListener ~ data`, {
      isSaved,
      data,
    });

    if (isSaved) {
      chrome.action.setBadgeText({
        text: '🟢',
      });
    }
  } catch (err) {
    console.log(`🚀 ~ chrome.webNavigation.onCompleted.addListener ~ err`, err);
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

chrome.contextMenus.create({
  contexts: ['page', 'link'],
  id: 'otter-context-save',
  title: 'Save to Otter',
})
