import type { AtlasExample } from 'vite-plugin-atlas/types'
import { CodeBlock, Code } from './CodeBlock'

export const InlineCode: AtlasExample = () => (
	<p>
		Use the <Code>console.log()</Code> function to debug your code.
	</p>
)
InlineCode.description = 'Inline code element within text'

export const SingleLineBlock: AtlasExample = () => (
	<CodeBlock>
		<Code>const greeting = "Hello, world!"</Code>
	</CodeBlock>
)
SingleLineBlock.description = 'Single line code block'

export const MultiLineBlock: AtlasExample = () => (
	<CodeBlock>
		<Code>{`function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10))`}</Code>
	</CodeBlock>
)
MultiLineBlock.description = 'Multi-line code block with a function example'

export const CodeBlockWithClassName: AtlasExample = () => (
	<CodeBlock className="text-sm">
		<Code>npm install vite-plugin-atlas</Code>
	</CodeBlock>
)
CodeBlockWithClassName.description = 'Code block with custom className'
