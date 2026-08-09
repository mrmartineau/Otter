import { describe, expect, it } from 'vitest'
import { type AuthEnv, getTokenLifetimes } from './server'

const HOUR = 60 * 60
const DAY = 24 * HOUR

const env = (overrides: Partial<AuthEnv> = {}) => overrides as AuthEnv

describe('getTokenLifetimes', () => {
  it('keeps native clients signed in for a year by default', () => {
    expect(getTokenLifetimes(env())).toEqual({
      accessTokenExpiresIn: 12 * HOUR,
      refreshTokenExpiresIn: 365 * DAY,
    })
  })

  it('honours explicit overrides', () => {
    expect(
      getTokenLifetimes(
        env({
          OAUTH_ACCESS_TOKEN_TTL: '3600',
          OAUTH_REFRESH_TOKEN_TTL: '2592000',
        }),
      ),
    ).toEqual({
      accessTokenExpiresIn: HOUR,
      refreshTokenExpiresIn: 30 * DAY,
    })
  })

  it('falls back rather than issuing a token that expires immediately', () => {
    for (const raw of ['', '0', '-1', 'forever', 'NaN']) {
      expect(
        getTokenLifetimes(
          env({ OAUTH_ACCESS_TOKEN_TTL: raw, OAUTH_REFRESH_TOKEN_TTL: raw }),
        ),
      ).toEqual({
        accessTokenExpiresIn: 12 * HOUR,
        refreshTokenExpiresIn: 365 * DAY,
      })
    }
  })

  it('truncates fractional seconds', () => {
    expect(
      getTokenLifetimes(env({ OAUTH_ACCESS_TOKEN_TTL: '90.7' }))
        .accessTokenExpiresIn,
    ).toBe(90)
  })
})
