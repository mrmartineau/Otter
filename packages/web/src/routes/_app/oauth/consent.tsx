import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Flex } from '@/components/Flex'
import { authClient } from '@/utils/auth/client'

export const Route = createFileRoute('/_app/oauth/consent')({
  component: RouteComponent,
})

const SCOPE_LABELS: Record<string, string> = {
  'bookmarks:read': 'Read your bookmarks',
  'bookmarks:write': 'Create and modify bookmarks',
  email: 'Access your email address',
  offline_access: 'Stay signed in',
  openid: 'Verify your identity',
  'profile:read': 'Read your profile',
}

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const search = new URLSearchParams(window.location.search)
  const scopes = (search.get('scope') ?? '').split(' ').filter(Boolean)
  const clientId = search.get('client_id') ?? ''

  const handleConsent = async (accept: boolean) => {
    setIsLoading(true)
    const result = await authClient.oauth2.consent({ accept })
    setIsLoading(false)
    if (result.data?.url) {
      window.location.href = result.data.url
    }
  }

  return (
    <Container variant="auth">
      <Flex direction="column" gap="m" className="mt-l">
        <h2 className="text-center">Authorize access</h2>
        {clientId ? (
          <p className="text-center text-sm opacity-70">{clientId}</p>
        ) : null}
        <p>This application is requesting access to:</p>
        <ul className="list-disc pl-m">
          {scopes.map((scope) => (
            <li key={scope}>{SCOPE_LABELS[scope] ?? scope}</li>
          ))}
        </ul>
        <Flex gap="m" justify="center">
          <Button
            onClick={() => handleConsent(true)}
            disabled={isLoading}
          >
            Authorize
          </Button>
          <Button
            variant="outline"
            onClick={() => handleConsent(false)}
            disabled={isLoading}
          >
            Deny
          </Button>
        </Flex>
      </Flex>
    </Container>
  )
}
