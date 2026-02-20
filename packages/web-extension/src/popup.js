import './popup.css'
import { browserAPI } from './browser-api.js'
;(() => {
  // We will make use of Storage API to get and store `count` value
  // More information on Storage API can we found at
  // https://developer.chrome.com/extensions/storage

  // To get storage access, we have to mention it in `permissions` property of manifest.json file
  // More information on Permissions can we found at
  // https://developer.chrome.com/extensions/declare_permissions
  const counterStorage = {
    get: (cb) => {
      browserAPI.storage.sync.get(['count'], (result) => {
        cb(result.count)
      })
    },
    set: (value, cb) => {
      browserAPI.storage.sync.set(
        {
          count: value,
        },
        () => {
          cb()
        },
      )
    },
  }

  function setupCounter(initialValue = 0) {
    document.getElementById('counter').innerHTML = initialValue

    document.getElementById('incrementBtn').addEventListener('click', () => {
      updateCounter({
        type: 'INCREMENT',
      })
    })

    document.getElementById('decrementBtn').addEventListener('click', () => {
      updateCounter({
        type: 'DECREMENT',
      })
    })
  }

  function updateCounter({ type }) {
    counterStorage.get((count) => {
      let newCount

      if (type === 'INCREMENT') {
        newCount = count + 1
      } else if (type === 'DECREMENT') {
        newCount = count - 1
      } else {
        newCount = count
      }

      counterStorage.set(newCount, () => {
        document.getElementById('counter').innerHTML = newCount

        // Communicate with content script of
        // active tab by sending a message
        browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0]

          browserAPI.tabs.sendMessage(
            tab.id,
            {
              payload: {
                count: newCount,
              },
              type: 'COUNT',
            },
            (response) => {
              console.log('Current count value passed to contentScript file')
            },
          )
        })
      })
    })
  }

  function restoreCounter() {
    // Restore count value
    counterStorage.get((count) => {
      if (typeof count === 'undefined') {
        // Set counter value as 0
        counterStorage.set(0, () => {
          setupCounter(0)
        })
      } else {
        setupCounter(count)
      }
    })
  }

  document.addEventListener('DOMContentLoaded', restoreCounter)

  // Communicate with background file by sending a message
  browserAPI.runtime.sendMessage(
    {
      payload: {
        message: 'Hello, my name is Pop. I am from Popup.',
      },
      type: 'GREETINGS',
    },
    (response) => {
      console.log(response.message)
    },
  )
})()
