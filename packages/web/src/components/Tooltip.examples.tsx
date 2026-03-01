import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Button } from './Button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './Tooltip'

export const Default: AtlasExample = () => (
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>This is a tooltip</TooltipContent>
		</Tooltip>
	</TooltipProvider>
)
Default.description = 'Basic tooltip on hover'

export const WithSideOffset: AtlasExample = () => (
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Large offset</Button>
			</TooltipTrigger>
			<TooltipContent sideOffset={12}>
				Tooltip with a larger offset
			</TooltipContent>
		</Tooltip>
	</TooltipProvider>
)
WithSideOffset.description = 'Tooltip with a custom sideOffset of 12px'

export const Sides: AtlasExample = () => (
	<TooltipProvider>
		<div style={{ display: 'flex', gap: '1rem' }}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline">Top</Button>
				</TooltipTrigger>
				<TooltipContent side="top">Top tooltip</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline">Right</Button>
				</TooltipTrigger>
				<TooltipContent side="right">Right tooltip</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline">Bottom</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">Bottom tooltip</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline">Left</Button>
				</TooltipTrigger>
				<TooltipContent side="left">Left tooltip</TooltipContent>
			</Tooltip>
		</div>
	</TooltipProvider>
)
Sides.description = 'Tooltips positioned on all four sides'
