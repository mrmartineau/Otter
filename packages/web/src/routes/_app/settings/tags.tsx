import { createFileRoute, useNavigate } from '@tanstack/react-router'
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

      if (!response.ok) {
        return navigate({
          search: {
            message: `Could not rename ${old_tag} to ${new_tag}`,
          },
          to: '/settings/tags',
        })
      }

      navigate({
        search: {
          message: `Renamed ${old_tag} to ${new_tag}`,
        },
        to: '/settings/tags',
      })
    },
    [navigate],
  )

  return (
    <div className="flow">
      <h2>All tags</h2>
      <ul className="flex flex-col gap-xs max-w-[400px] w-full">
        {tags?.length
          ? tags.map(({ tag }) => {
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
