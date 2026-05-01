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
import { ROUTE_HOME } from '@/constants'
import { useToggle } from '@/hooks/useToggle'
import { authClient } from '@/utils/auth/client'

type RegisterSearch = {
  error?: string
  message?: string
  redirect?: string
}

export const Route = createFileRoute('/_public/register/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): RegisterSearch => {
    return {
      error: (search.error as string) || '',
      message: (search.message as string) || '',
      redirect: (search.redirect as string) || '',
    }
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isLoading, , setIsLoading] = useToggle(false)
  const searchParams = useSearch({ from: '/_public/register/' })
  const error = searchParams?.error
  const message = searchParams?.message
  const redirectTo = searchParams?.redirect

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.target as HTMLFormElement)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setIsLoading(false)
      return navigate({
        search: { error: 'Passwords do not match' },
        to: '/register',
      })
    }

    const { error } = await authClient.signUp.email({
      email,
      name: name || email,
      password,
    })

    if (error) {
      setIsLoading(false)
      return navigate({
        search: { error: error.message || 'Could not create account' },
        to: '/register',
      })
    }

    setIsLoading(false)
    if (redirectTo) {
      return navigate({ to: redirectTo })
    }
    return navigate({ to: ROUTE_HOME })
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
      <h2 className="mt-s text-center">Create an account</h2>

      <form onSubmit={handleRegister}>
        <Flex direction={'column'} gap="m">
          <FormGroup label="Name" name="name">
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="Your name"
              autoComplete="name"
            />
          </FormGroup>
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
          <FormGroup label="Password" name="password">
            <Input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </FormGroup>
          <FormGroup label="Confirm password" name="confirmPassword">
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
            <Button type="submit" disabled={isLoading}>
              Sign Up
            </Button>
            <Link to="/signin" className="self-center">
              Already have an account? Sign in
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
