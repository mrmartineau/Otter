import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Button } from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

export const Default: AtlasExample = () => (
	<Popover>
		<PopoverTrigger asChild>
			<Button variant="outline">Open popover</Button>
		</PopoverTrigger>
		<PopoverContent>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
				<p style={{ fontWeight: 600 }}>Popover title</p>
				<p style={{ fontSize: '0.875rem' }}>
					This is some popover content with useful information.
				</p>
			</div>
		</PopoverContent>
	</Popover>
)
Default.description = 'Basic popover with text content'

export const WithSideOffset: AtlasExample = () => (
	<Popover>
		<PopoverTrigger asChild>
			<Button variant="outline">Offset popover</Button>
		</PopoverTrigger>
		<PopoverContent sideOffset={12}>
			<p>This popover has a larger gap from the trigger.</p>
		</PopoverContent>
	</Popover>
)
WithSideOffset.description = 'Popover with a custom sideOffset of 12px'

export const AlignStart: AtlasExample = () => (
	<Popover>
		<PopoverTrigger asChild>
			<Button variant="outline">Align start</Button>
		</PopoverTrigger>
		<PopoverContent align="start">
			<p>This popover is aligned to the start of the trigger.</p>
		</PopoverContent>
	</Popover>
)
AlignStart.description = 'Popover aligned to the start edge'

export const AlignEnd: AtlasExample = () => (
	<Popover>
		<PopoverTrigger asChild>
			<Button variant="outline">Align end</Button>
		</PopoverTrigger>
		<PopoverContent align="end">
			<p>This popover is aligned to the end of the trigger.</p>
		</PopoverContent>
	</Popover>
)
AlignEnd.description = 'Popover aligned to the end edge'
