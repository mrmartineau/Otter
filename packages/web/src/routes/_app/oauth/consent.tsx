import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'

export const Route = createFileRoute('/_app/oauth/consent')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Container variant="auth">
      <Flex direction="column" gap="m" className="mt-l">
        <h2 className="text-center">OAuth authorization is unavailable</h2>
        <p className="text-center">
          Third-party OAuth consent is paused while account authorization moves
          to the new auth service.
        </p>
        <Flex justify="center">
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </Flex>
      </Flex>
    </Container>
  )
}
