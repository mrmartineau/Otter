import type { AtlasExample } from 'vite-plugin-atlas/types'
import { FormGroup } from './FormGroup'
import { Input } from './Input'

export const Default: AtlasExample = () => (
	<FormGroup label="Email address" name="email">
		<Input type="email" name="email" placeholder="you@example.com" />
	</FormGroup>
)
Default.description = 'Basic form group with a visible label and text input.'

export const WithNote: AtlasExample = () => (
	<FormGroup
		label="API key"
		name="api-key"
		note="You can find your API key in the developer settings."
	>
		<Input type="text" name="api-key" placeholder="sk_live_..." />
	</FormGroup>
)
WithNote.description = 'Form group with a helper note displayed below the input.'

export const WithError: AtlasExample = () => (
	<FormGroup label="Username" name="username" error="Username is already taken.">
		<Input type="text" name="username" defaultValue="admin" />
	</FormGroup>
)
WithError.description = 'Form group displaying a validation error message.'

export const HiddenLabel: AtlasExample = () => (
	<FormGroup label="Search" name="search" labelIsVisible={false}>
		<Input type="search" name="search" placeholder="Search bookmarks…" />
	</FormGroup>
)
HiddenLabel.description =
	'Form group with a visually hidden label for screen-reader accessibility.'

export const WithLabelSuffix: AtlasExample = () => (
	<FormGroup
		label="Description"
		name="description"
		labelSuffix={<span style={{ opacity: 0.5, fontSize: '0.75rem' }}>Optional</span>}
	>
		<Input type="text" name="description" placeholder="Add a description…" />
	</FormGroup>
)
WithLabelSuffix.description = 'Form group with a suffix element next to the label.'
