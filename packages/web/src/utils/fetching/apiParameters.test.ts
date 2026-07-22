import { describe, expect, it } from 'vitest'
import { apiParameters } from './apiParameters'

describe('apiParameters window', () => {
  it('passes through a positive integer window', () => {
    expect(apiParameters({ window: 1 }).window).toBe(1)
    expect(apiParameters({ window: 3 }).window).toBe(3)
  })

  it('coerces string values from the query string', () => {
    expect(apiParameters({ window: '2' as unknown as number }).window).toBe(2)
  })

  it('drops zero, negative and invalid values', () => {
    expect(apiParameters({ window: 0 }).window).toBeUndefined()
    expect(apiParameters({ window: -1 }).window).toBeUndefined()
    expect(
      apiParameters({ window: 'abc' as unknown as number }).window,
    ).toBeUndefined()
    expect(apiParameters({}).window).toBeUndefined()
  })

  it('floors fractional values', () => {
    expect(apiParameters({ window: 2.9 }).window).toBe(2)
  })
})
