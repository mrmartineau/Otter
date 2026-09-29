import './popup.css'
import { browserAPI } from './browser-api.js'
import { getStorageItems } from './getStorageItems'

// The popup is a menu: every action runs in the background script so the
// context menu and keyboard shortcuts share the same code.

const status = document.getElementById('status')
const buttons = document.querySelectorAll('button')

const setStatus = (text, isError = false) => {
  status.textContent = text
  status.hidden = !text
  status.classList.toggle('error', isError)
}

// Popup links open in a new tab; a plain href would load inside the popup.
const showLink = (id, href) => {
  const link = document.getElementById(`${id}-link`)
  link.href = href
  link.onclick = (event) => {
    event.preventDefault()
    browserAPI.tabs.create({ url: href })
    window.close()
  }
  document.getElementById(id).hidden = false
}

const currentTab = async () => {
  const [tab] = await browserAPI.tabs.query({
    active: true,
    currentWindow: true,
  })
  return tab
}

const run = async (type) => {
  const tab = await currentTab()
  if (!tab?.url) return

  for (const button of buttons) button.disabled = true
  setStatus(type === 'bookmark' ? '' : 'Saving…')

  // The tab title is a fallback: sites behind a bot wall refuse the server's
  // fetch, and a bookmark with the real title beats a bare URL.
  const result = await browserAPI.runtime.sendMessage({
    title: tab.title,
    type,
    url: tab.url,
  })

  if (result?.ok && result.link) {
    // Stay open so the new bookmark's link can be clicked.
    setStatus('')
    document.getElementById('existing').hidden = true
    document.getElementById('read-later').hidden = true
    document.getElementById('bookmark').hidden = true
    showLink('saved', result.link)
  } else if (result?.ok) {
    setStatus(type === 'read-later' ? 'Saved to Read later.' : 'Saved.')
    setTimeout(() => window.close(), 900)
  } else if (type === 'bookmark') {
    window.close()
  } else {
    setStatus(result?.error ?? 'Something went wrong.', true)
    for (const button of buttons) button.disabled = false
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await currentTab()
  document.getElementById('url').textContent = tab?.url ?? ''

  const { otterInstanceUrl } = await getStorageItems()
  if (!otterInstanceUrl) {
    document.getElementById('setup').hidden = false
    for (const button of buttons) button.disabled = true
  } else if (tab?.url?.startsWith('http')) {
    browserAPI.runtime
      .sendMessage({ type: 'check-url', url: tab.url })
      .then(([link] = []) => link && showLink('existing', link))
  }

  document.getElementById('options').addEventListener('click', (event) => {
    event.preventDefault()
    browserAPI.runtime.openOptionsPage()
  })

  document
    .getElementById('quick-save')
    .addEventListener('click', () => run('quick-save'))
  document
    .getElementById('read-later')
    .addEventListener('click', () => run('read-later'))
  document
    .getElementById('bookmark')
    .addEventListener('click', () => run('bookmark'))
})
