import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [oauthProviderClient()],
})

export type AuthSession = typeof authClient.$Infer.Session
