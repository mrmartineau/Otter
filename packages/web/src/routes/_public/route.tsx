import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PublicLayout } from '@/components/PublicLayout'
import { getSession } from '@/utils/fetching/user'
import { ROUTE_HOME } from '../../constants'

export const Route = createFileRoute('/_public')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) {
      throw redirect({ to: ROUTE_HOME })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  )
}
