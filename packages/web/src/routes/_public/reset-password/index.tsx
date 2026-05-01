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

type ResetPasswordSearch = {
  token?: string
  error?: string
  message?: string
}

export const Route = createFileRoute('/_public/reset-password/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
    return {
      error: (search.error as string) || '',
      message: (search.message as string) || '',
      token: (search.token as string) || '',
    }
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isLoading, , setIsLoading] = useToggle(false)
  const { token, error, message } = useSearch({
    from: '/_public/reset-password/',
  })

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.target as HTMLFormElement)
    const newPassword = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setIsLoading(false)
      return navigate({
        search: { error: 'Passwords do not match', token },
        to: '/reset-password',
      })
    }

    if (!token) {
      setIsLoading(false)
      return navigate({
        search: {
          error: 'Missing reset token. Request a new password reset link.',
        },
        to: '/reset-password',
      })
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    })

    setIsLoading(false)

    if (resetError) {
      return navigate({
        search: {
          error: resetError.message || 'Could not reset password',
          token,
        },
        to: '/reset-password',
      })
    }

    return navigate({
      search: { message: 'Password reset. You can now sign in.' },
      to: '/signin',
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
      <h2 className="mt-s text-center">Reset your password</h2>

      <form onSubmit={handleReset}>
        <Flex direction={'column'} gap="m">
          <FormGroup label="New password" name="password">
            <Input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </FormGroup>
          <FormGroup label="Confirm new password" name="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </FormGroup>

          <Flex gap="m" justify="between">
            <Button type="submit" disabled={isLoading || !token}>
              Reset password
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
