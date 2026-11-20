import kit from '@mrmartineau/kit/oxfmt' with { type: 'json' }

export default { ...kit, ignorePatterns: ['packages/**/dist/**', 'packages/web/src/routeTree.gen.ts', 'packages/web/src/types/supabase.ts', 'packages/web/.wrangler/**', '**/drizzle', '**/*.xcassets', 'packages/web/worker-configuration.d.ts', '**/*.md', '**/*.mdx', '**/*.yml', '**/*.yaml', '**/*.html'] }
