import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './db/schema.ts',
  strict: true,
  verbose: true,
})
