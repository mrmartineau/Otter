import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Spinner } from './Spinner'

export const Default: AtlasExample = () => <Spinner show />
Default.description = 'Default spinning indicator at the standard 26px size.'

export const Large: AtlasExample = () => <Spinner show size={50} />
Large.description = 'Larger spinner for full-page loading states.'

export const Small: AtlasExample = () => <Spinner show size={16} />
Small.description = 'Compact spinner for inline loading indicators.'

export const Hidden: AtlasExample = () => <Spinner show={false} />
Hidden.description = 'Spinner in its hidden state (opacity 0) — useful for reserving layout space before loading begins.'

export const DelayedReveal: AtlasExample = () => <Spinner show wait="delay-500" />
DelayedReveal.description =
	'Spinner with a 500ms transition delay, preventing flash for fast operations.'
