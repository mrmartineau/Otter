import { browserAPI } from './browser-api.js'

export const getStorageItems = async () => {
  const { otterInstanceUrl } =
    await browserAPI.storage.sync.get('otterInstanceUrl')
  const { newBookmarkWindowBehaviour } = await browserAPI.storage.sync.get(
    'newBookmarkWindowBehaviour',
  )
  return {
    newBookmarkWindowBehaviour,
    otterInstanceUrl,
  }
}
