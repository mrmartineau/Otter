import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Button } from './Button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './Dialog'

export const Center: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button>Open center dialog</Button>
		</DialogTrigger>
		<DialogContent
			title="Center dialog"
			description="This dialog is centered on the screen."
		>
			<p>Dialog body content goes here.</p>
			<DialogClose asChild>
				<Button variant="outline">Close</Button>
			</DialogClose>
		</DialogContent>
	</Dialog>
)
Center.description = 'Default center placement dialog with title and description'

export const Left: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button>Open left dialog</Button>
		</DialogTrigger>
		<DialogContent title="Left panel" placement="left">
			<p>This dialog slides in from the left.</p>
		</DialogContent>
	</Dialog>
)
Left.description = 'Dialog with left placement'

export const Right: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button>Open right dialog</Button>
		</DialogTrigger>
		<DialogContent title="Right panel" placement="right">
			<p>This dialog slides in from the right.</p>
		</DialogContent>
	</Dialog>
)
Right.description = 'Dialog with right placement'

export const Small: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button>Open small dialog</Button>
		</DialogTrigger>
		<DialogContent title="Small dialog" width="s">
			<p>A small width dialog.</p>
		</DialogContent>
	</Dialog>
)
Small.description = 'Dialog with small width'

export const Large: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button>Open large dialog</Button>
		</DialogTrigger>
		<DialogContent title="Large dialog" width="l">
			<p>A large width dialog with more room for content.</p>
		</DialogContent>
	</Dialog>
)
Large.description = 'Dialog with large width'

export const WithoutTitle: AtlasExample = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button variant="outline">Open minimal dialog</Button>
		</DialogTrigger>
		<DialogContent>
			<p>This dialog has no title or description, just body content.</p>
			<DialogClose asChild>
				<Button>Done</Button>
			</DialogClose>
		</DialogContent>
	</Dialog>
)
WithoutTitle.description = 'Dialog without title or description'
