import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import { useToggle } from '@/hooks/useToggle'
import { authClient } from '@/utils/auth/client'

type ForgotPasswordSearch = {
  error?: string
  message?: string
}

export const Route = createFileRoute('/_public/forgot-password/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ForgotPasswordSearch => {
    return {
      error: (search.error as string) || '',
      message: (search.message as string) || '',
    }
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isLoading, , setIsLoading] = useToggle(false)
  const searchParams = useSearch({ from: '/_public/forgot-password/' })
  const error = searchParams?.error
  const message = searchParams?.message

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.target as HTMLFormElement)
    const email = formData.get('email') as string

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setIsLoading(false)

    if (error) {
      return navigate({
        search: {
          error: error.message || 'Could not send password reset email',
        },
        to: '/forgot-password',
      })
    }

    return navigate({
      search: {
        message:
          'If an account exists for that email, a password reset link has been sent.',
      },
      to: '/forgot-password',
    })
  }

  return (
    <Container variant="auth">
      <img
        src="/otter-logo.svg"
        width="90"
        height="90"
        className="mx-auto mt-l"
        alt="Otter logo"
      />
      <h2 className="mt-s text-center">Forgot your password?</h2>
      <p className="text-center text-neutral-400">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleForgotPassword}>
        <Flex direction={'column'} gap="m">
          <FormGroup label="Email" name="email">
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormGroup>

          <Flex gap="m" justify="between">
            <Button type="submit" disabled={isLoading}>
              Send reset link
            </Button>
            <Link to="/signin" className="self-center">
              Back to sign in
            </Link>
          </Flex>

          {error ? (
            <p className="mt-4 bg-neutral-900 p-4 text-center text-neutral-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 bg-neutral-900 p-4 text-center text-neutral-300">
              {message}
            </p>
          ) : null}
        </Flex>
      </form>
    </Container>
  )
}
