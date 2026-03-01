import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Textarea } from './Textarea'

export const Default: AtlasExample = () => (
	<Textarea placeholder="Add a note about this bookmark…" />
)
Default.description = 'Default auto-sizing textarea'

export const WithValue: AtlasExample = () => (
	<Textarea defaultValue="This article explains how to set up a self-hosted bookmark manager. Very useful for organising research links." />
)
WithValue.description = 'Textarea pre-filled with a note'

export const WithMinRows: AtlasExample = () => (
	<Textarea minRows={4} placeholder="Write a detailed description…" />
)
WithMinRows.description = 'Textarea with a minimum of 4 rows'

export const WithMaxRows: AtlasExample = () => (
	<Textarea
		maxRows={6}
		defaultValue={
			'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8'
		}
	/>
)
WithMaxRows.description = 'Textarea capped at 6 visible rows before scrolling'

export const Disabled: AtlasExample = () => (
	<Textarea disabled defaultValue="This note cannot be edited" />
)
Disabled.description = 'Disabled textarea prevents editing'

export const WithLabel: AtlasExample = () => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
		<label htmlFor="note" style={{ fontSize: '14px', fontWeight: 500 }}>
			Personal note
		</label>
		<Textarea id="note" placeholder="Why did you save this?" />
	</div>
)
WithLabel.description = 'Textarea with an associated label'
