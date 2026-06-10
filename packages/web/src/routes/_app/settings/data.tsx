import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Label } from '@/components/Label'
import {
  type BookmarkImportResult,
  importBookmarksFile,
} from '@/utils/fetching/bookmarks'
import { getErrorMessage } from '@/utils/get-error-message'

export const Route = createFileRoute('/_app/settings/data')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Import & export',
      },
    ],
  }),
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<BookmarkImportResult | null>(null)

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const file = fileInputRef.current?.files?.[0]

    if (!file) {
      toast.error('Choose a bookmarks HTML file first')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const { data } = await importBookmarksFile(file)
      setResult(data)
      toast.success(
        `Imported ${data.imported} bookmark${data.imported === 1 ? '' : 's'}`,
      )

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['meta'] })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  return (
    <article className="flow">
      <h3>Import bookmarks</h3>
      <p>
        Import bookmarks from a <code>bookmarks.html</code> file — the standard
        export format of Chrome, Firefox, Safari, Edge, Pinboard and most other
        bookmark managers. Folder names and tags in the file become Otter tags,
        and bookmarks with a URL you have already saved are skipped.
      </p>
      <form onSubmit={handleImport} className="flex flex-col gap-s">
        <div className="form-group">
          <Label htmlFor="bookmarksFile" className="mb-1">
            Bookmarks HTML file
          </Label>
          <input
            ref={fileInputRef}
            id="bookmarksFile"
            name="bookmarksFile"
            type="file"
            accept=".html,.htm,text/html"
          />
        </div>
        <div>
          <Button type="submit" disabled={importing}>
            {importing ? 'Importing…' : 'Import bookmarks'}
          </Button>
        </div>
      </form>
      {result ? (
        <output className="block">
          Found {result.found} bookmark{result.found === 1 ? '' : 's'} in the
          file: {result.imported} imported, {result.skipped} skipped as already
          saved.
        </output>
      ) : null}

      <h3>Export bookmarks</h3>
      <p>
        Download all your active bookmarks as a <code>bookmarks.html</code> file
        that can be imported into any browser or bookmark manager.
      </p>
      <div>
        <Button asChild>
          <a href="/api/bookmarks/export" download>
            Export bookmarks
          </a>
        </Button>
      </div>
    </article>
  )
}
