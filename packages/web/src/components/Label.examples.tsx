import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Input } from './Input'
import { Label } from './Label'

export const Default: AtlasExample = () => <Label>Bookmark title</Label>
Default.description = 'Standalone label'

export const WithInput: AtlasExample = () => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
		<Label htmlFor="title">Title</Label>
		<Input id="title" placeholder="Enter a title…" />
	</div>
)
WithInput.description = 'Label associated with an input via htmlFor'

export const WithDescription: AtlasExample = () => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
		<Label htmlFor="tags">Tags</Label>
		<Input id="tags" placeholder="react, typescript, tooling" />
		<span style={{ fontSize: '12px', opacity: 0.6 }}>
			Comma-separated list of tags
		</span>
	</div>
)
WithDescription.description = 'Label with input and helper text'

export const Required: AtlasExample = () => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
		<Label htmlFor="url">
			URL <span style={{ color: 'red' }}>*</span>
		</Label>
		<Input id="url" placeholder="https://…" required />
	</div>
)
Required.description = 'Label indicating a required field'
