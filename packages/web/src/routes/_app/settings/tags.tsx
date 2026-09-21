import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { Button } from '@/components/Button'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import type { MetaTag } from '@/utils/fetching/meta'

export const Route = createFileRoute('/_app/settings/tags')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Tag management',
      },
    ],
  }),
  loader: async () => {
    const response = await fetch('/api/tags', {
      credentials: 'include',
    })

    if (!response.ok) {
      return { tags: [] as MetaTag[] }
    }

    const tags = (await response.json()) as MetaTag[]

    return {
      tags: tags.toSorted((a, b) => (a.tag ?? '').localeCompare(b.tag ?? '')),
    }
  },
})

function RouteComponent() {
  const { tags } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  // The loader only re-runs when the URL changes, and the URL here is the same
  // page with a different message, which is the same URL when two attempts
  // produce the same text. Invalidating refetches the list either way.
  const refresh = useCallback(
    (message: string) => {
      router.invalidate()
      navigate({ search: { message }, to: '/settings/tags' })
    },
    [navigate, router],
  )

  const handleRenameTag = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const old_tag = formData.get('old_tag') as string
      const new_tag = formData.get('new_tag') as string

      const response = await fetch('/api/tags/rename', {
        body: JSON.stringify({ new_tag, old_tag }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      refresh(
        response.ok
          ? `Renamed ${old_tag} to ${new_tag}`
          : `Could not rename ${old_tag} to ${new_tag}`,
      )
    },
    [refresh],
  )

  /**
   * Deleting drops the tag from every bookmark carrying it and cannot be
   * undone, so the count goes in the prompt — "shop" is 183 bookmarks, and
   * the name alone does not say that.
   */
  const handleDeleteTag = useCallback(
    async (tag: string, count: number | null) => {
      const used = count ?? 0
      const confirmed = window.confirm(
        `Delete "${tag}"?\n\nIt will be removed from ${used} bookmark${
          used === 1 ? '' : 's'
        }. The bookmarks themselves are kept. This cannot be undone.`,
      )

      if (!confirmed) {
        return
      }

      const response = await fetch('/api/tags', {
        body: JSON.stringify({ tag }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      })

      refresh(response.ok ? `Deleted ${tag}` : `Could not delete ${tag}`)
    },
    [refresh],
  )

  return (
    <div className="flow">
      <h2>All tags</h2>
      <ul className="flex flex-col gap-xs max-w-[400px] w-full">
        {tags?.length
          ? tags.map(({ count, tag }) => {
              if (!tag) {
                return null
              }

              return (
                <li key={tag}>
                  <form onSubmit={handleRenameTag}>
                    <input type="hidden" name="old_tag" value={tag} />
                    <FormGroup label="Tag" name={`new_tag-${tag}`}>
                      <div className="flex items-baseline gap-xs">
                        <Input
                          id={`new_tag-${tag}`}
                          name="new_tag"
                          defaultValue={tag}
                        />
                        <Button type="submit" variant="outline" size="xs">
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDeleteTag(tag, count)}
                        >
                          Delete
                        </Button>
                      </div>
                    </FormGroup>
                  </form>
                </li>
              )
            })
          : null}
      </ul>
    </div>
  )
}
