import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Favicon } from './Favicon'

export const GitHub: AtlasExample = () => <Favicon url="https://github.com" />
GitHub.description = 'Favicon fetched from DuckDuckGo icons for github.com.'

export const Wikipedia: AtlasExample = () => <Favicon url="https://en.wikipedia.org/wiki/Main_Page" />
Wikipedia.description = 'Favicon for a URL with a deep path — only the domain is used.'

export const MultipleInline: AtlasExample = () => (
	<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
		<Favicon url="https://github.com" />
		<Favicon url="https://stackoverflow.com" />
		<Favicon url="https://developer.mozilla.org" />
		<Favicon url="https://reddit.com" />
	</div>
)
MultipleInline.description = 'Multiple favicons displayed inline, as seen in bookmark lists.'
