import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { supabase } from '@/utils/supabase/client'

type ConsentSearch = {
  authorization_id?: string
}

export const Route = createFileRoute('/_app/oauth/consent')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
    authorization_id: (search.authorization_id as string) || undefined,
  }),
})

function RouteComponent() {
  const { authorization_id } = Route.useSearch()
  const [authDetails, setAuthDetails] = useState<{
    client: { name: string }
    redirect_uri?: string
    scope?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!authorization_id) {
      setError('Missing authorization_id')
      setIsLoading(false)
      return
    }

    supabase.auth.oauth
      .getAuthorizationDetails(authorization_id)
      .then(({ data, error }) => {
        if (error || !data) {
          setError(error?.message || 'Invalid authorization request')
        } else {
          setAuthDetails(data)
        }
        setIsLoading(false)
      })
  }, [authorization_id])

  const handleDecision = async (decision: 'approve' | 'deny') => {
    if (!authorization_id) return
    setIsSubmitting(true)

    const method =
      decision === 'approve'
        ? supabase.auth.oauth.approveAuthorization
        : supabase.auth.oauth.denyAuthorization

    const { data, error } = await method(authorization_id)

    if (error) {
      setError(error.message)
      setIsSubmitting(false)
      return
    }

    window.location.href = data.redirect_url
  }

  if (isLoading) {
    return (
      <Container variant="auth">
        <p className="mt-l text-center">Loading authorization details…</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container variant="auth">
        <p className="mt-l text-center text-destructive">{error}</p>
      </Container>
    )
  }

  if (!authDetails) return null

  return (
    <Container variant="auth">
      <Flex direction="column" gap="m" className="mt-l">
        <h2 className="text-center">Authorize {authDetails.client.name}</h2>
        <p className="text-center">
          This application wants to access your account.
        </p>

        <div className="rounded-lg bg-neutral-900 p-m">
          <Flex direction="column" gap="xs">
            <p>
              <strong>Client:</strong> {authDetails.client.name}
            </p>
            <p>
              <strong>Redirect URI:</strong> {authDetails.redirect_uri}
            </p>
            {authDetails.scope?.trim() && (
              <div>
                <strong>Requested permissions:</strong>
                <ul className="mt-2xs list-inside list-disc">
                  {authDetails.scope.split(' ').map((scopeItem) => (
                    <li key={scopeItem}>{scopeItem}</li>
                  ))}
                </ul>
              </div>
            )}
          </Flex>
        </div>

        <Flex gap="m" justify="center">
          <Button
            variant="secondary"
            onClick={() => handleDecision('deny')}
            disabled={isSubmitting}
          >
            Deny
          </Button>
          <Button
            onClick={() => handleDecision('approve')}
            disabled={isSubmitting}
          >
            Approve
          </Button>
        </Flex>
      </Flex>
    </Container>
  )
}
