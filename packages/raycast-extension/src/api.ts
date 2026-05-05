import { getPreferenceValues, OAuth } from '@raycast/api'
import urlJoin from 'proper-url-join'

const prefs = getPreferenceValues<{
  oauthClientId: string
  otterBasePath: string
  showDetailView: boolean
}>()
const otterBasePath = prefs.otterBasePath.replace(/\/+$/, '')

const scope = [
  'openid',
  'email',
  'offline_access',
  'bookmarks:read',
  'bookmarks:write',
  'profile:read',
].join(' ')

const oauthClient = new OAuth.PKCEClient({
  description: 'Connect your Otter Bookmarks account',
  providerIcon: 'command-icon.png',
  providerName: 'Otter',
  redirectMethod: OAuth.RedirectMethod.Web,
})

export async function authorize() {
  await getAccessToken()
}

let pendingAccessToken: Promise<string> | null = null

export async function getAccessToken() {
  if (pendingAccessToken) {
    return pendingAccessToken
  }
  pendingAccessToken = (async () => {
    try {
      return await getAccessTokenInner()
    } finally {
      pendingAccessToken = null
    }
  })()
  return pendingAccessToken
}

async function getAccessTokenInner() {
  const tokenSet = await oauthClient.getTokens()

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokens = await refreshTokens(tokenSet.refreshToken)
      await oauthClient.setTokens(newTokens)
      return newTokens.access_token
    }

    return tokenSet.accessToken
  }

  const authRequest = await oauthClient.authorizationRequest({
    clientId: prefs.oauthClientId,
    endpoint: apiUrl('/api/auth/oauth2/authorize'),
    scope,
  })

  const { authorizationCode } = await oauthClient.authorize(authRequest)
  const tokens = await fetchTokens(authRequest, authorizationCode)
  await oauthClient.setTokens(tokens)

  return tokens.access_token
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await getAccessToken()
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  })
  const body = await response.json()

  if (!response.ok) {
    const errorBody = body as { error?: string; reason?: string }
    throw new Error(errorBody.error || errorBody.reason || response.statusText)
  }

  return body as T
}

export function apiUrl(path: string, query?: Record<string, unknown>) {
  const queryValues: Record<string, string | number | readonly string[]> = {}

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      (Array.isArray(value) &&
        value.every((item): item is string => typeof item === 'string'))
    ) {
      queryValues[key] = value
    }
  }

  return urlJoin(otterBasePath, path, {
    query: Object.keys(queryValues).length ? queryValues : undefined,
  })
}

async function postToken(
  params: Record<string, string>,
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams({
    ...params,
    client_id: prefs.oauthClientId,
    resource: otterBasePath,
  })

  const response = await fetch(apiUrl('/api/auth/oauth2/token'), {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  })

  if (!response.ok) {
    console.error('token endpoint error:', await response.text())
    throw new Error(response.statusText)
  }

  return (await response.json()) as OAuth.TokenResponse
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  return postToken({
    code: authCode,
    code_verifier: authRequest.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: authRequest.redirectURI,
  })
}

async function refreshTokens(
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  return postToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}
