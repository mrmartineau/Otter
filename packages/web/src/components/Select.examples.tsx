import type { AtlasExample } from 'vite-plugin-atlas/types'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from './Select'

export const Default: AtlasExample = () => (
	<Select>
		<SelectTrigger>
			<SelectValue placeholder="Select a fruit" />
		</SelectTrigger>
		<SelectContent>
			<SelectItem value="apple">Apple</SelectItem>
			<SelectItem value="banana">Banana</SelectItem>
			<SelectItem value="cherry">Cherry</SelectItem>
			<SelectItem value="grape">Grape</SelectItem>
		</SelectContent>
	</Select>
)
Default.description = 'Basic select with a list of items'

export const Small: AtlasExample = () => (
	<Select>
		<SelectTrigger size="sm">
			<SelectValue placeholder="Small trigger" />
		</SelectTrigger>
		<SelectContent>
			<SelectItem value="a">Option A</SelectItem>
			<SelectItem value="b">Option B</SelectItem>
			<SelectItem value="c">Option C</SelectItem>
		</SelectContent>
	</Select>
)
Small.description = 'Select with small trigger size'

export const WithGroups: AtlasExample = () => (
	<Select>
		<SelectTrigger>
			<SelectValue placeholder="Pick a food" />
		</SelectTrigger>
		<SelectContent>
			<SelectGroup>
				<SelectLabel>Fruits</SelectLabel>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="cherry">Cherry</SelectItem>
			</SelectGroup>
			<SelectSeparator />
			<SelectGroup>
				<SelectLabel>Vegetables</SelectLabel>
				<SelectItem value="carrot">Carrot</SelectItem>
				<SelectItem value="broccoli">Broccoli</SelectItem>
				<SelectItem value="spinach">Spinach</SelectItem>
			</SelectGroup>
		</SelectContent>
	</Select>
)
WithGroups.description = 'Select with grouped items, labels, and a separator'

export const WithDisabledItems: AtlasExample = () => (
	<Select>
		<SelectTrigger>
			<SelectValue placeholder="Choose a plan" />
		</SelectTrigger>
		<SelectContent>
			<SelectItem value="free">Free</SelectItem>
			<SelectItem value="pro">Pro</SelectItem>
			<SelectItem value="enterprise" disabled>
				Enterprise (coming soon)
			</SelectItem>
		</SelectContent>
	</Select>
)
WithDisabledItems.description = 'Select with a disabled item'
