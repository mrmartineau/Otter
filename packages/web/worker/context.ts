import { eq } from 'drizzle-orm'
import type { Context, HonoRequest } from 'hono'
import { createLocalJWKSet, jwtVerify, type JWK } from 'jose'
import { createAuth, getOAuthAudience } from '../auth/server'
import { createDb, type Db } from '../db/client'
import { profiles } from '../db/schema'
import type { UserProfile } from '../src/types/db'
import { errorResponse } from '../src/utils/fetching/errorResponse'
import type { WorkerEnv } from './env'

export type RequestContext = {
  db: Db
  profile: UserProfile | null
  user: { id: string; email: string } | null
}

type Profile = typeof profiles.$inferSelect

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const profileToRow = (profile: Profile): UserProfile => ({
  api_key: profile.apiKey,
  avatar_url: profile.avatarUrl,
  id: profile.id,
  settings_collections_visible: profile.settingsCollectionsVisible,
  settings_group_by_date: profile.settingsGroupByDate,
  settings_pinned_tags: profile.settingsPinnedTags,
  settings_tags_visible: profile.settingsTagsVisible,
  settings_top_tags_count:
    profile.settingsTopTagsCount === null
      ? null
      : Number(profile.settingsTopTagsCount),
  settings_types_visible: profile.settingsTypesVisible,
  updated_at: profile.updatedAt?.toISOString() ?? null,
  username: profile.username,
})

const getBearerToken = (request: HonoRequest) => {
  const authHeader = request.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice('Bearer '.length).trim() || null
}

export const getProfileById = async (db: Db, userId: string) => {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  return profile ? profileToRow(profile) : null
}

export const getProfileByApiKey = async (db: Db, apiKey: string) => {
  if (!uuidPattern.test(apiKey)) {
    return null
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.apiKey, apiKey))
    .limit(1)

  return profile ? profileToRow(profile) : null
}

const getProfileByOAuthToken = async (
  env: WorkerEnv,
  db: Db,
  auth: ReturnType<typeof createAuth>,
  accessToken: string,
  scopes: string[] = [],
) => {
  try {
    const audience = getOAuthAudience(env)
    const issuer = `${audience}/api/auth`
    const jwks = (await auth.api.getJwks()) as { keys: JWK[] }
    const keySet = createLocalJWKSet(jwks)
    const { payload } = await jwtVerify(accessToken, keySet, {
      audience,
      issuer,
    })

    if (scopes.length) {
      const tokenScopes = new Set(
        typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
      )
      for (const sc of scopes) {
        if (!tokenScopes.has(sc)) return null
      }
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : null
    return userId ? await getProfileById(db, userId) : null
  } catch (err) {
    console.error('getProfileByOAuthToken failed:', err)
    return null
  }
}

export const createRequestContext = async (
  context: Context<{ Bindings: WorkerEnv }>,
  scopes: string[] = [],
): Promise<RequestContext> => {
  const db = createDb(context.env)
  const auth = createAuth(context.env)
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  })

  if (session?.user) {
    return {
      db,
      profile: await getProfileById(db, session.user.id),
      user: {
        email: session.user.email,
        id: session.user.id,
      },
    }
  }

  const bearerToken = getBearerToken(context.req)

  if (bearerToken) {
    const profile =
      (await getProfileByApiKey(db, bearerToken)) ??
      (await getProfileByOAuthToken(context.env, db, auth, bearerToken, scopes))

    return {
      db,
      profile,
      user: profile
        ? {
            email: profile.username ?? '',
            id: profile.id,
          }
        : null,
    }
  }

  return { db, profile: null, user: null }
}

export const requireRequestContext = async (
  context: Context<{ Bindings: WorkerEnv }>,
  scopes: string[] = [],
) => {
  const requestContext = await createRequestContext(context, scopes)

  if (!requestContext.user || !requestContext.profile) {
    return errorResponse({
      error: 'Authentication required',
      reason: 'Missing or invalid session/API key',
      status: 401,
    })
  }

  return requestContext
}
