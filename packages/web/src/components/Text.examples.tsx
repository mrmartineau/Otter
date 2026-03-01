import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Text } from './Text'

export const Default: AtlasExample = () => (
	<Text>Default text with no variant</Text>
)
Default.description = 'Text with no variant applied'

export const Caps: AtlasExample = () => (
	<Text variant="caps">Uppercase tracking text</Text>
)
Caps.description = 'Text with caps variant — uppercase with tight tracking'

export const Count: AtlasExample = () => (
	<Text variant="count">42</Text>
)
Count.description = 'Text with count variant for displaying numbers'

export const WithClassName: AtlasExample = () => (
	<Text variant="caps" className="text-red-500">
		Custom styled caps text
	</Text>
)
WithClassName.description = 'Text with variant and additional className'
