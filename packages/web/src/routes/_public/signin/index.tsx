import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import { ROUTE_HOME } from '@/constants'
import { useToggle } from '@/hooks/useToggle'
import { supabase } from '@/utils/supabase/client'

type SigninSearch = {
  error?: string
  message?: string
  redirect?: string
}

export const Route = createFileRoute('/_public/signin/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): SigninSearch => {
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
  const searchParams = useSearch({ from: '/_public/signin/' })
  const error = searchParams?.error
  const message = searchParams?.message
  const redirectTo = searchParams?.redirect

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.target as HTMLFormElement)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsLoading(false)
      return navigate({
        search: { message: 'Could not authenticate user' },
        to: '/signin',
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
      <h2 className="mt-s text-center">Sign in</h2>

      <form onSubmit={handleSignIn}>
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
          <FormGroup label="Password" name="password">
            <Input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="email"
            />
          </FormGroup>

          <Flex gap="m" justify="between">
            {/* {ALLOW_SIGNUP ? (
              <Button formAction={signUp} variant="secondary">
                Sign Up
              </Button>
            ) : null} */}
            <Button type="submit" disabled={isLoading}>
              Sign In
            </Button>
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
