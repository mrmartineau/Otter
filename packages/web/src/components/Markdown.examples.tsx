import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Markdown } from './Markdown'

const sampleMarkdown = `## Getting Started

This is a **bold** statement and this is *italic*. Here's a [link to the docs](https://example.com/docs).

- First item
- Second item
- Third item

> A blockquote for important notes.

Inline \`code\` and a code block:

\`\`\`js
const greeting = 'Hello, world!'
console.log(greeting)
\`\`\``

export const Default: AtlasExample = () => <Markdown>{sampleMarkdown}</Markdown>
Default.description = 'Rich markdown with headings, lists, links, blockquotes, and code blocks.'

export const PreventClamping: AtlasExample = () => (
	<Markdown preventClamping>{sampleMarkdown}</Markdown>
)
PreventClamping.description =
	'Markdown with clamping disabled — all content is visible without a "See more" toggle.'

export const ShortContent: AtlasExample = () => (
	<Markdown>A simple one-line note with a [link](https://example.com).</Markdown>
)
ShortContent.description = 'Short markdown content that does not trigger line clamping.'

export const GfmTable: AtlasExample = () => (
	<Markdown preventClamping>
		{`| Feature | Status |
| --- | --- |
| Markdown | ✅ Supported |
| GFM Tables | ✅ Supported |
| Strikethrough | ~~yes~~ |`}
	</Markdown>
)
GfmTable.description = 'GitHub Flavored Markdown table with strikethrough support.'
