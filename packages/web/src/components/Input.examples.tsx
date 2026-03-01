import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Input } from './Input'

export const Default: AtlasExample = () => (
	<Input placeholder="https://example.com" />
)
Default.description = 'Default text input with placeholder'

export const WithValue: AtlasExample = () => (
	<Input defaultValue="https://github.com/mrmartineau/otter" />
)
WithValue.description = 'Input pre-filled with a URL'

export const Search: AtlasExample = () => (
	<Input type="search" placeholder="Search bookmarks…" />
)
Search.description = 'Search input type'

export const Password: AtlasExample = () => (
	<Input type="password" placeholder="API token" />
)
Password.description = 'Password input for sensitive fields'

export const Email: AtlasExample = () => (
	<Input type="email" placeholder="you@example.com" />
)
Email.description = 'Email input with appropriate keyboard on mobile'

export const Disabled: AtlasExample = () => (
	<Input disabled placeholder="Cannot edit" />
)
Disabled.description = 'Disabled input prevents interaction'

export const WithLabel: AtlasExample = () => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
		<label htmlFor="url-input" style={{ fontSize: '14px', fontWeight: 500 }}>
			Bookmark URL
		</label>
		<Input id="url-input" placeholder="https://…" />
	</div>
)
WithLabel.description = 'Input paired with a label for accessibility'

export const File: AtlasExample = () => <Input type="file" />
File.description = 'File upload input'
