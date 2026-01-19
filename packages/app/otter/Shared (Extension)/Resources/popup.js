document.addEventListener('DOMContentLoaded', async () => {
  const api = typeof browser !== 'undefined' ? browser : chrome

  async function getActiveTab() {
    const query = { active: true, currentWindow: true }
    try {
      const result = api.tabs.query(query)
      if (result && typeof result.then === 'function') {
        return (await result)[0]
      }
      return await new Promise((resolve) =>
        api.tabs.query(query, (tabs) => resolve(tabs[0]))
      )
    } catch (_) {
      return await new Promise((resolve) =>
        api.tabs.query(query, (tabs) => resolve(tabs[0]))
      )
    }
  }

  try {
    const tab = await getActiveTab()
    const currentUrl = tab && tab.url ? tab.url : ''
    const iframe = document.getElementById('otter-bookmark')
    if (!iframe) return

    const base = 'https://otter3.zander.wtf/new/bookmark?bookmarklet=true&url='
    const encoded = encodeURIComponent(currentUrl)
    iframe.src = base + encoded
  } catch (error) {
    console.error('Failed to set iframe src', error)
  }
})
