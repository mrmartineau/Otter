import browser from 'webextension-polyfill'

// Use browser.* APIs with fallback to chrome.* for compatibility
export const browserAPI = typeof browser !== 'undefined' ? browser : chrome
