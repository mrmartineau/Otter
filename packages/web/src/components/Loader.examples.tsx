import type { AtlasExample } from 'vite-plugin-atlas/types'
import { FullLoader, Loader } from './Loader'

export const Default: AtlasExample = () => <Loader />
Default.description = 'Simple inline spinner for embedding within content areas.'

export const Full: AtlasExample = () => (
	<div style={{ height: 200 }}>
		<FullLoader />
	</div>
)
Full.description =
	'Centered large spinner that fills its container, ideal for page or panel loading states.'
