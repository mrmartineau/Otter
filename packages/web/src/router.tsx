import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { AuthProvider, useSession } from './components/AuthProvider'
import { FullLoader } from './components/Loader'
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
})
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
})

const router = createRouter({
  context: {
    queryClient,
    session: null,
  },
  defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
  defaultPendingComponent: () => <FullLoader />,
  defaultPreload: 'intent',
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  routeTree,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export const Router = () => {
  const session = useSession()
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <RouterProvider router={router} context={{ queryClient, session }} />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} position="left" />
    </PersistQueryClientProvider>
  )
}
