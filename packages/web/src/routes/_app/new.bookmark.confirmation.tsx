import { CheckCircleIcon } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ROUTE_FEED } from '@/constants'

export const Route = createFileRoute('/_app/new/bookmark/confirmation')({
  component: RouteComponent,
  validateSearch: (search: {
    id?: string
    bookmarklet?: string
  }): { id?: string; bookmarklet?: string } => ({
    bookmarklet: search.bookmarklet,
    id: search.id,
  }),
})

function RouteComponent() {
  const { id } = Route.useSearch()

  return (
    <div className="flex h-dvh min-h-[60vh] flex-col items-center justify-center gap-m text-center">
      <CheckCircleIcon weight="duotone" size={64} />
      <h1 className="text-2xl font-semibold">Item added</h1>
      {id ? (
        <Link
          to="/bookmark/$id"
          params={{ id }}
          className="text-sm text-(--text-2) underline underline-offset-2 hover:text-(--text-1)"
        >
          View added item
        </Link>
      ) : null}
      <Link
        to={ROUTE_FEED}
        className="text-sm text-(--text-2) underline underline-offset-2 hover:text-(--text-1)"
      >
        Go to feed
      </Link>
    </div>
  )
}
