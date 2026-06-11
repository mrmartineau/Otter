import {
  DownloadSimpleIcon,
  PlusCircleIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { type FormEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import {
  type FeedSubscription,
  useAddFeedSubscriptionMutation,
  useImportOpmlMutation,
} from '@/utils/fetching/feeds'
import { Flex } from './Flex'
import { FormGroup } from './FormGroup'
import { Input } from './Input'

interface AddFeedFormProps {
  subscriptions: FeedSubscription[]
}

export const AddFeedForm = ({ subscriptions }: AddFeedFormProps) => {
  const [url, setUrl] = useState('')
  const [folder, setFolder] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFeed = useAddFeedSubscriptionMutation()
  const importOpml = useImportOpmlMutation()

  const existingFolders = [
    ...new Set(
      subscriptions
        .map((subscription) => subscription.folder)
        .filter((item): item is string => Boolean(item)),
    ),
  ]

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!url.trim()) {
      return
    }
    addFeed.mutate(
      { folder: folder.trim() || undefined, url: url.trim() },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: ({ data }) => {
          toast.success('Subscribed', {
            description: data.title ?? data.feed_url,
          })
          setUrl('')
          setFolder('')
        },
      },
    )
  }

  const handleOpmlFile = async (file: File) => {
    const opml = await file.text()
    importOpml.mutate(
      { opml },
      {
        onError: (error) => {
          toast.error(error.message)
        },
        onSuccess: ({ added, skipped }) => {
          toast.success(
            `Imported ${added} feed${added === 1 ? '' : 's'}${
              skipped ? ` (${skipped} already subscribed)` : ''
            }`,
          )
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex gapX="2xs" gapY="2xs" align="end" wrap="wrap">
        <FormGroup label="Site or feed URL" name="feed-url" className="grow">
          <Input
            id="feed-url"
            name="feed-url"
            placeholder="https://example.com or https://example.com/feed.xml"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </FormGroup>
        <FormGroup label="Folder (optional)" name="feed-folder">
          <Input
            id="feed-folder"
            name="feed-folder"
            placeholder="e.g. Tech"
            list="feed-folders"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
          />
          <datalist id="feed-folders">
            {existingFolders.map((item) => (
              <option value={item} key={item} />
            ))}
          </datalist>
        </FormGroup>
        <Button type="submit" disabled={addFeed.isPending || !url.trim()}>
          <PlusCircleIcon size={16} weight="duotone" />
          {addFeed.isPending ? 'Subscribing…' : 'Subscribe'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={importOpml.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadSimpleIcon size={16} weight="duotone" />
          {importOpml.isPending ? 'Importing…' : 'Import OPML'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,.xml,text/xml,text/x-opml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleOpmlFile(file)
            }
            event.target.value = ''
          }}
        />
        {subscriptions.length ? (
          <Button asChild variant="ghost">
            <a href="/api/feeds/export" download>
              <DownloadSimpleIcon size={16} weight="duotone" />
              Export OPML
            </a>
          </Button>
        ) : null}
      </Flex>
    </form>
  )
}
