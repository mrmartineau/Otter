export const getStorageItems = async () => {
  const { otterInstanceUrl } = await chrome.storage.sync.get(
    'otterInstanceUrl'
  );
  const { newBookmarkWindowBehaviour } = await chrome.storage.sync.get(
    'newBookmarkWindowBehaviour'
  );
  return {
    newBookmarkWindowBehaviour,
    otterInstanceUrl,
  };
};
