import type { Session } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from '@tanstack/react-router'

interface MyRouterContext {
  session: Session | null
  queryClient: QueryClient
}
export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
})
