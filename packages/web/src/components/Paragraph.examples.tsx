import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Paragraph } from './Paragraph'

export const Default: AtlasExample = () => (
	<Paragraph>
		This is a paragraph of text. It renders a standard HTML paragraph element
		with the "paragraph" class applied for consistent styling.
	</Paragraph>
)
Default.description = 'Default paragraph'

export const MultipleParagraphs: AtlasExample = () => (
	<div>
		<Paragraph>
			First paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
			Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
		</Paragraph>
		<Paragraph>
			Second paragraph. Ut enim ad minim veniam, quis nostrud exercitation
			ullamco laboris nisi ut aliquip ex ea commodo consequat.
		</Paragraph>
	</div>
)
MultipleParagraphs.description = 'Multiple paragraphs in sequence'

export const WithClassName: AtlasExample = () => (
	<Paragraph className="italic">
		A paragraph with an additional custom class applied.
	</Paragraph>
)
WithClassName.description = 'Paragraph with custom className'
