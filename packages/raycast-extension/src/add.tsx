import { Action, ActionPanel, Form, showToast, Toast } from '@raycast/api'
import { useEffect, useState } from 'react'
import { URL } from 'url'
import { apiFetch } from './api'
import { Authenticated } from './components/Authenticated'
import { copy } from './utils/copy'

const AddBookmark = () => {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    async function getUrl() {
      try {
        const copiedUrl = await copy()
        new URL(copiedUrl)
        setUrl(copiedUrl)
      } catch (err) {
        return
      }
    }
    getUrl()
  }, [])

  async function handleSubmit(values: { url: string }) {
    try {
      new URL(values.url)
      await apiFetch('/api/new', {
        body: JSON.stringify([{ scrape: true, url: values.url }]),
        method: 'POST',
      })
      await showToast({
        style: Toast.Style.Success,
        title: 'Bookmark added',
      })
    } catch (err) {
      await showToast({
        message: 'Try again with a proper url',
        style: Toast.Style.Failure,
        title: "The URL isn't valid",
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Url" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Bookmark Url"
        placeholder="https://example.com"
        value={url}
        onChange={(value) => setUrl(value)}
      />
    </Form>
  )
}

export default function Command() {
  return (
    <Authenticated>
      <AddBookmark />
    </Authenticated>
  )
}
