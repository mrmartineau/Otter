import { describe, expect, it } from 'vitest'
import { matchTagsSource } from './matchTags'

// The real bookmark that exposed the bug: getaphex.com came back with 23 tags.
const aphex = {
  description:
    'The open source CMS that lives inside your SvelteKit app: schema as code, a Studio for editors, typed APIs and visual editing on a database you own.',
  title: 'Aphex CMS — A SvelteKit CMS That Runs in Your App',
}

const tags = [
  'app',
  'app:ios',
  'app:mac',
  'app:vision-pro',
  'ai:code',
  'CMS',
  'cms:headless',
  'code',
  'data',
  'database',
  'editor',
  'for:robbie',
  'IDE',
  'mac:app',
  'api',
  'svelte',
  'sveltekit',
  'rc',
].map((tag) => ({ count: 1, tag }))

describe('matchTagsSource', () => {
  it('only matches whole words', () => {
    const matched = matchTagsSource(aphex, tags)

    // "inside" used to match "IDE", "source" matched "rc", "database" matched
    // "data", and "SvelteKit" matched "svelte".
    expect(matched).not.toContain('IDE')
    expect(matched).not.toContain('rc')
    expect(matched).not.toContain('data')
    expect(matched).not.toContain('svelte')
  })

  it('needs every part of a namespaced tag, not just one', () => {
    const matched = matchTagsSource(aphex, tags)

    // The single word "app" used to pull in every `app:*` tag at once.
    expect(matched).not.toContain('app:mac')
    expect(matched).not.toContain('app:ios')
    expect(matched).not.toContain('app:vision-pro')
    expect(matched).not.toContain('mac:app')
    expect(matched).not.toContain('for:robbie')
    expect(matched).not.toContain('cms:headless')
  })

  it('keeps the tags the page really does mention', () => {
    expect(matchTagsSource(aphex, tags).sort()).toEqual([
      'CMS',
      'api',
      'app',
      'code',
      'database',
      'editor',
      'sveltekit',
    ])
  })

  it('reads a plural as its singular', () => {
    // "typed APIs" should still reach "api".
    expect(matchTagsSource(aphex, tags)).toContain('api')
  })

  it('returns nothing without text or tags', () => {
    expect(matchTagsSource({}, tags)).toEqual([])
    expect(matchTagsSource(aphex, [])).toEqual([])
  })
})
