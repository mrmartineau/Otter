import { oauthProvider } from '@better-auth/oauth-provider'
import { compare, hash } from 'bcryptjs'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { jwt } from 'better-auth/plugins'
import type { Db } from '../db/client'
import type { DbEnv } from '../db/client'
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
}

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
