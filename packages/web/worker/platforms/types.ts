export type PlatformCredentials = Record<string, string>

export interface PlatformItemInput {
  createdAt?: Date
  description?: string | null
  externalId: string
  image?: string | null
  metadata?: unknown
  title?: string | null
  url?: string | null
}

export interface PlatformFetchArgs {
  credentials: PlatformCredentials
  /** Soft cap on how many items a single sync should fetch */
  limit?: number
}

export type PlatformFetcher = (
  args: PlatformFetchArgs,
) => Promise<PlatformItemInput[]>

export const DEFAULT_SYNC_LIMIT = 200

export const requireCredential = (
  credentials: PlatformCredentials,
  key: string,
  platform: string,
): string => {
  const value = credentials[key]?.trim()

  if (!value) {
    throw new Error(`Missing ${platform} credential: ${key}`)
  }

  return value
}
