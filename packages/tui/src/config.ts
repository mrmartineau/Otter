import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface OtterConfig {
  apiKey: string
  baseUrl: string
}

export const configPath = () =>
  join(
    process.env.XDG_CONFIG_HOME || join(homedir(), '.config'),
    'otter',
    'config.json',
  )

const normaliseBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '')

/**
 * Resolve config from `OTTER_BASE_URL` / `OTTER_API_KEY` env vars, falling
 * back to ~/.config/otter/config.json. Returns null when incomplete.
 */
export const loadConfig = (): OtterConfig | null => {
  let file: Partial<OtterConfig> = {}

  try {
    file = JSON.parse(readFileSync(configPath(), 'utf8')) as
      | Partial<OtterConfig>
      | Record<string, never>
  } catch {
    // missing or invalid file — fall through to env-only
  }

  const baseUrl = process.env.OTTER_BASE_URL || file.baseUrl
  const apiKey = process.env.OTTER_API_KEY || file.apiKey

  if (!baseUrl || !apiKey) {
    return null
  }

  return { apiKey: apiKey.trim(), baseUrl: normaliseBaseUrl(baseUrl) }
}

export const saveConfig = (config: OtterConfig) => {
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        apiKey: config.apiKey.trim(),
        baseUrl: normaliseBaseUrl(config.baseUrl),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  )

  return path
}
