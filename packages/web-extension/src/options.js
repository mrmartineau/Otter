import { browserAPI } from "./browser-api.js";
import { getStorageItems } from "./getStorageItems";

window.onload = () => {
  const optionsForm = document.querySelector("form");
  const errorDiv = document.querySelector(".error");
  optionsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(optionsForm);
    for (const pair of formData.entries()) {
      console.log(`${pair[0]}, ${pair[1]}`);
    }

    browserAPI.storage.sync.set({
      newBookmarkWindowBehaviour: formData.get("new-bookmark-window-behaviour"),
      otterInstanceUrl: formData.get("url"),
    });
    browserAPI.action.setBadgeText({
      text: "",
    });
    errorDiv.setAttribute("hidden", true);
  });

  const urlField = document.querySelector("#url");
  browserAPI.storage.sync.get("otterInstanceUrl", ({ otterInstanceUrl }) => {
    urlField.value = otterInstanceUrl;
  });

  getStorageItems().then(({ otterInstanceUrl }) => {
    if (!otterInstanceUrl) {
      errorDiv.removeAttribute("hidden");
    } else {
      errorDiv.setAttribute("hidden", true);
    }
  });
};
