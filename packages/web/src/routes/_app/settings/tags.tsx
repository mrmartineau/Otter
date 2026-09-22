import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TextAaIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { IconButton } from '@/components/IconButton'
import { Input } from '@/components/Input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/Tooltip'
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
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<'alpha' | 'count'>('alpha')

  const visibleTags = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const matching = tags.filter(
      ({ tag }) => tag && (!needle || tag.toLowerCase().includes(needle)),
    )

    // The loader hands these over already sorted by name, so only the other
    // order costs a sort. Ties fall back to the name, the way /api/tags orders
    // its own rows.
    return sort === 'alpha'
      ? matching
      : matching.toSorted(
          (a, b) =>
            (b.count ?? 0) - (a.count ?? 0) ||
            (a.tag ?? '').localeCompare(b.tag ?? ''),
        )
  }, [filter, sort, tags])

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
    <TooltipProvider>
      <div className="flow">
        <h2>All tags</h2>

        <div className="max-w-[420px] w-full flow">
          <div className="relative">
            <MagnifyingGlassIcon
              size={16}
              weight="duotone"
              className="absolute left-xs top-1/2 -translate-y-1/2 text-theme10 pointer-events-none"
            />
            <Input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter tags"
              aria-label="Filter tags"
              autoComplete="off"
              className="pl-l"
            />
          </div>
          <div className="flex items-center justify-between gap-xs">
            <p className="text-step--2 text-theme10">
              {visibleTags.length === tags.length
                ? `${tags.length} tags`
                : `${visibleTags.length} of ${tags.length} tags`}
            </p>
            <div className="flex items-center gap-3xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    type="button"
                    size="m"
                    aria-pressed={sort === 'alpha'}
                    onClick={() => setSort('alpha')}
                  >
                    <TextAaIcon weight="duotone" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Sort A to Z</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    type="button"
                    size="m"
                    aria-pressed={sort === 'count'}
                    onClick={() => setSort('count')}
                  >
                    <ChartBarIcon weight="duotone" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Sort by most bookmarks</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-2xs max-w-[420px] w-full">
          {visibleTags.map(({ count, tag }) => {
            if (!tag) {
              return null
            }

            return (
              <li key={tag}>
                <form
                  onSubmit={handleRenameTag}
                  className="flex items-center gap-2xs"
                >
                  <input type="hidden" name="old_tag" value={tag} />
                  <Input
                    name="new_tag"
                    defaultValue={tag}
                    aria-label={`Rename ${tag}`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span
                    className="text-step--2 text-theme10 tabular-nums min-w-[3ch] text-right"
                    title={`Used on ${count ?? 0} bookmarks`}
                  >
                    {count ?? 0}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton type="submit" size="m">
                        <PencilIcon weight="duotone" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Save this name</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        type="button"
                        size="m"
                        onClick={() => handleDeleteTag(tag, count)}
                      >
                        <TrashIcon weight="duotone" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Delete this tag</TooltipContent>
                  </Tooltip>
                </form>
              </li>
            )
          })}
        </ul>

        {visibleTags.length === 0 ? (
          <p className="text-theme10">No tags match “{filter}”.</p>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
