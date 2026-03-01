import { BookmarkSimpleIcon, HeartIcon, StarIcon } from '@phosphor-icons/react'
import type { AtlasExample } from 'vite-plugin-atlas/types'
import { IconControl } from './IconControl'

export const Checkbox: AtlasExample = () => (
	<IconControl label="Star" type="checkbox" name="star" value="starred">
		<StarIcon size={24} />
	</IconControl>
)
Checkbox.description = 'Single checkbox icon control for toggling a boolean state.'

export const RadioGroup: AtlasExample = () => (
	<div style={{ display: 'flex', gap: 8 }}>
		<IconControl label="Bookmark" type="radio" name="action" value="bookmark">
			<BookmarkSimpleIcon size={24} />
		</IconControl>
		<IconControl label="Star" type="radio" name="action" value="star">
			<StarIcon size={24} />
		</IconControl>
		<IconControl label="Favourite" type="radio" name="action" value="favourite">
			<HeartIcon size={24} />
		</IconControl>
	</div>
)
RadioGroup.description = 'Radio group of icon controls — only one can be selected at a time.'
