import {
	PencilIcon,
	PlusCircleIcon,
	StarIcon,
	TrashIcon,
	XCircleIcon,
} from '@phosphor-icons/react'
import type { AtlasExample } from 'vite-plugin-atlas/types'
import { IconButton } from './IconButton'

export const Default: AtlasExample = () => (
	<IconButton aria-label="Add bookmark">
		<PlusCircleIcon />
	</IconButton>
)
Default.description = 'Default icon button with standard rounding'

export const Nav: AtlasExample = () => (
	<IconButton variant="nav" aria-label="Delete">
		<TrashIcon />
	</IconButton>
)
Nav.description = 'Nav variant with destructive styling'

export const Taglist: AtlasExample = () => (
	<IconButton variant="taglist" aria-label="Remove tag">
		<XCircleIcon />
	</IconButton>
)
Taglist.description = 'Taglist variant for inline tag removal'

export const Circle: AtlasExample = () => (
	<IconButton shape="circle" aria-label="Star">
		<StarIcon />
	</IconButton>
)
Circle.description = 'Circular icon button'

export const SizeLarge: AtlasExample = () => (
	<IconButton size="l" aria-label="Edit">
		<PencilIcon />
	</IconButton>
)
SizeLarge.description = 'Large icon button (44×44)'

export const SizeMedium: AtlasExample = () => (
	<IconButton size="m" aria-label="Add">
		<PlusCircleIcon />
	</IconButton>
)
SizeMedium.description = 'Medium icon button (24×24)'

export const SizeSmall: AtlasExample = () => (
	<IconButton size="s" aria-label="Remove">
		<XCircleIcon />
	</IconButton>
)
SizeSmall.description = 'Small icon button (20×20)'

export const Disabled: AtlasExample = () => (
	<IconButton disabled aria-label="Star">
		<StarIcon />
	</IconButton>
)
Disabled.description = 'Disabled icon button'

export const AllSizes: AtlasExample = () => (
	<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
		<IconButton size="s" aria-label="Small">
			<StarIcon />
		</IconButton>
		<IconButton size="m" aria-label="Medium">
			<StarIcon />
		</IconButton>
		<IconButton size="default" aria-label="Default">
			<StarIcon />
		</IconButton>
		<IconButton size="l" aria-label="Large">
			<StarIcon />
		</IconButton>
	</div>
)
AllSizes.description = 'All icon button sizes side by side'
