import { oauthProvider } from '@better-auth/oauth-provider'
import { compare, hash } from 'bcryptjs'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { jwt } from 'better-auth/plugins'
import type { Db, DbEnv } from '../db/client'
import {
  authAccounts,
  authJwks,
  authSessions,
  authUsers,
  authVerifications,
  oauthAccessTokens,
  oauthClients,
  oauthConsents,
  oauthRefreshTokens,
  profiles,
} from '../db/schema'

export type AuthEnv = DbEnv & {
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  BETTER_AUTH_TRUSTED_ORIGINS?: string
  BETTER_AUTH_DISABLE_SIGNUP?: string
  RAYCAST_OAUTH_CLIENT_ID?: string
  OAUTH_ACCESS_TOKEN_TTL?: string
  OAUTH_REFRESH_TOKEN_TTL?: string
}

const HOUR_IN_SECONDS = 60 * 60
const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS

/**
 * Native clients — the iOS app and its share extension — have nowhere sensible
 * to put a sign-in prompt, so the grant is meant to last until it's revoked.
 *
 * Refresh tokens rotate, and each rotation restarts the window, so a device
 * used at least once a year never signs itself out. The access token is a
 * signed JWT that nothing checks against the database, so its lifetime is also
 * how long a leaked one keeps working: twelve hours trades a little of that for
 * far fewer rotations, and every rotation is a chance for two clients sharing a
 * grant to race. Both are overridable for instances that want the OAuth
 * defaults (1 hour / 30 days) back.
 */
const DEFAULT_ACCESS_TOKEN_TTL = 12 * HOUR_IN_SECONDS
const DEFAULT_REFRESH_TOKEN_TTL = 365 * DAY_IN_SECONDS

const readSeconds = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const getTokenLifetimes = (env: AuthEnv) => ({
  accessTokenExpiresIn: readSeconds(
    env.OAUTH_ACCESS_TOKEN_TTL,
    DEFAULT_ACCESS_TOKEN_TTL,
  ),
  refreshTokenExpiresIn: readSeconds(
    env.OAUTH_REFRESH_TOKEN_TTL,
    DEFAULT_REFRESH_TOKEN_TTL,
  ),
})

const getTrustedOrigins = (env: AuthEnv) => {
  const origins = env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (origins?.length) {
    return origins
  }

  return env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : undefined
}

const isSignUpDisabled = (env: AuthEnv) =>
  env.BETTER_AUTH_DISABLE_SIGNUP !== 'false'

export const getOAuthAudience = (env: AuthEnv) => {
  return (env.BETTER_AUTH_URL ?? 'http://localhost:5678').replace(/\/+$/, '')
}

const getTrustedOAuthClients = (env: AuthEnv) =>
  env.RAYCAST_OAUTH_CLIENT_ID
    ? new Set([env.RAYCAST_OAUTH_CLIENT_ID])
    : undefined

export const createAuth = (env: AuthEnv, db: Db) => {
  return betterAuth({
    advanced: {
      database: {
        generateId: 'uuid',
      },
      trustedProxyHeaders: true,
    },
    basePath: '/api/auth',
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        account: authAccounts,
        jwks: authJwks,
        oauthAccessToken: oauthAccessTokens,
        oauthClient: oauthClients,
        oauthConsent: oauthConsents,
        oauthRefreshToken: oauthRefreshTokens,
        session: authSessions,
        user: authUsers,
        verification: authVerifications,
      },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db
              .insert(profiles)
              .values({
                id: user.id,
                username: user.email,
              })
              .onConflictDoNothing()
          },
        },
      },
    },
    emailAndPassword: {
      disableSignUp: isSignUpDisabled(env),
      enabled: true,
      password: {
        hash: (password) => hash(password, 10),
        verify: ({ hash: stored, password }) => compare(password, stored),
      },
    },
    plugins: [
      jwt(),
      oauthProvider({
        ...getTokenLifetimes(env),
        // Native clients (the iOS app) register themselves via RFC 7591 rather
        // than shipping a per-instance client ID. A registered client still
        // can't reach any data until a user signs in and consents.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        cachedTrustedClients: getTrustedOAuthClients(env),
        consentPage: '/oauth/consent',
        loginPage: '/signin',
        scopes: [
          'openid',
          'email',
          'offline_access',
          'bookmarks:read',
          'bookmarks:write',
          'profile:read',
        ],
        validAudiences: [getOAuthAudience(env)],
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    silenceWarnings: {
      oauthAuthServerConfig: true,
    },
    trustedOrigins: getTrustedOrigins(env),
  })
}
