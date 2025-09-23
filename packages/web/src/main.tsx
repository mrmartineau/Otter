import { NuqsAdapter } from 'nuqs/adapters/react'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { Router } from './router'

// biome-ignore lint/style/noNonNullAssertion: we can be sure that the root element exists
const rootElement = document.getElementById('root')!

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <NuqsAdapter>
          <Router />
        </NuqsAdapter>
      </ErrorBoundary>
    </StrictMode>,
  )
}
