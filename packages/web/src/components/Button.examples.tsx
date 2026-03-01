import { PlusCircleIcon, StarIcon, TrashIcon } from '@phosphor-icons/react'
import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Button } from './Button'

export const Default: AtlasExample = () => <Button>Save bookmark</Button>
Default.description = 'Default button with primary accent background'

export const Secondary: AtlasExample = () => (
	<Button variant="secondary">Cancel</Button>
)
Secondary.description = 'Secondary button for less prominent actions'

export const Destructive: AtlasExample = () => (
	<Button variant="destructive">
		<TrashIcon />
		Delete bookmark
	</Button>
)
Destructive.description = 'Destructive button for dangerous actions'

export const Outline: AtlasExample = () => (
	<Button variant="outline">Import bookmarks</Button>
)
Outline.description = 'Outlined button for secondary actions'

export const Ghost: AtlasExample = () => (
	<Button variant="ghost">Show more</Button>
)
Ghost.description = 'Ghost button with no background until hovered'

export const Nav: AtlasExample = () => (
	<Button variant="nav">
		<StarIcon />
		Stars
	</Button>
)
Nav.description = 'Navigation button used in the sidebar'

export const Icon: AtlasExample = () => (
	<Button variant="icon">
		<PlusCircleIcon />
	</Button>
)
Icon.description = 'Icon-only button with fixed dimensions'

export const Cmdk: AtlasExample = () => (
	<Button variant="cmdk">Search bookmarks…</Button>
)
Cmdk.description = 'Command palette trigger button'

export const Collapsible: AtlasExample = () => (
	<Button variant="collapsible" size="collapsible">
		⌄
	</Button>
)
Collapsible.description = 'Small collapsible toggle button'

export const SizeSmall: AtlasExample = () => (
	<Button size="xs">Tag</Button>
)
SizeSmall.description = 'Extra-small button for compact UI areas'

export const SizeLarge: AtlasExample = () => (
	<Button size="l">Create collection</Button>
)
SizeLarge.description = 'Large button for prominent call-to-action'

export const Disabled: AtlasExample = () => (
	<Button disabled>Saving…</Button>
)
Disabled.description = 'Disabled state prevents interaction'

export const AllSizes: AtlasExample = () => (
	<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
		<Button size="2xs">2xs</Button>
		<Button size="xs">xs</Button>
		<Button size="s">s</Button>
		<Button size="m">m</Button>
		<Button size="l">l</Button>
	</div>
)
AllSizes.description = 'All available button sizes side by side'
