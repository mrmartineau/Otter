import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { Container } from '@/components/Container'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { UserProvider } from '@/components/UserProvider'
import { getSession } from '@/utils/fetching/user'
import pkg from '../../../package.json'
import { ROUTE_SIGNIN } from '../../constants'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: ROUTE_SIGNIN,
        search: { redirect: location.href },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <UserProvider>
      <div className="otter-app-container">
        <TopBar />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="otter-primary-pane">
          <Sidebar version={pkg.version} />
          <div className="otter-sidebar-pane-overlay" />
          <main id="main" className="otter-content-pane">
            <div className="otter-content-pane-inner">
              <Container className="h-full">
                <Outlet />
              </Container>
            </div>
          </main>
        </div>
        <Toaster position="bottom-center" richColors />
      </div>
    </UserProvider>
  )
}
