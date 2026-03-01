import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Container } from './Container'

export const Default: AtlasExample = () => (
	<Container>
		<p>This is content inside the default container.</p>
	</Container>
)
Default.description = 'Default container with no variant'

export const Auth: AtlasExample = () => (
	<Container variant="auth">
		<p>This is content inside the auth container variant.</p>
	</Container>
)
Auth.description = 'Container with auth variant for authentication pages'

export const WithClassName: AtlasExample = () => (
	<Container className="border border-dashed">
		<p>Container with additional custom className.</p>
	</Container>
)
WithClassName.description = 'Container with custom className merged in'
