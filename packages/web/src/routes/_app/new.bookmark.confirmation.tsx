import { CheckCircleIcon } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ROUTE_FEED } from '@/constants'

export const Route = createFileRoute('/_app/new/bookmark/confirmation')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-m text-center">
      <CheckCircleIcon weight="duotone" size={64} />
      <h1 className="text-2xl font-semibold">Item added</h1>
      <Link
        to={ROUTE_FEED}
        className="text-sm text-[var(--text-2)] underline underline-offset-2 hover:text-[var(--text-1)]"
      >
        Go to feed
      </Link>
    </div>
  )
}
