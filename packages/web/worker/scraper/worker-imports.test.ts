import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `src/utils/fetching/*` is written for the SPA: its helpers call `fetch` on
 * relative URLs with browser-only options such as `cache: 'force-cache'`. A
 * Worker has no origin to resolve those against and rejects those options at
 * runtime, not at build time — which is how quick-save shipped broken. Handlers
 * must call the scraper and its friends in-process instead.
 *
 * Type-only imports are fine, and so are the pure helpers that never fetch.
 */
const workerRoot = join(import.meta.dirname, '..')
const fetchingRoot = join(workerRoot, '..', 'src', 'utils', 'fetching')

const tsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return tsFiles(path)
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  })

/** A fetching helper that performs a network call, so is browser-only. */
const callsFetch = (moduleName: string) => {
  const path = join(fetchingRoot, `${moduleName}.ts`)
  return existsSync(path) && /\bfetch\(/.test(readFileSync(path, 'utf8'))
}

describe('worker imports', () => {
  it('never imports SPA fetching helpers that call fetch', () => {
    const offenders = tsFiles(workerRoot)
      .filter((path) => !path.endsWith('.test.ts'))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8')
        const lines =
          source.match(/^import(?! type).*utils\/fetching\/.*$/gm) ?? []

        return lines
          .map((line) => line.match(/utils\/fetching\/([\w-]+)/)?.[1])
          .filter((name) => name && callsFetch(name))
          .map((name) => `${path.split('/worker/')[1]} → ${name}`)
      })

    expect(offenders).toEqual([])
  })

  it('recognises a fetching helper that calls fetch', () => {
    // Guards the guard: if scrape.ts ever stops fetching, this test is moot.
    expect(callsFetch('scrape')).toBe(true)
  })
})
