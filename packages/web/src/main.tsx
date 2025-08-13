import { NuqsAdapter } from 'nuqs/adapters/react'
import { StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { FullLoader } from './components/Loader'
import { ErrorBoundary } from 'react-error-boundary'

// biome-ignore lint/style/noNonNullAssertion: we can be sure that the root element exists
const rootElement = document.getElementById('root')!

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<FullLoader />}>
          <NuqsAdapter>
            <Router />
          </NuqsAdapter>
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  )
}
