-- Bluesky integration migration
-- Run this in your Supabase SQL editor

-- 1. Add bluesky_post_uri to bookmarks for idempotency
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS bluesky_post_uri TEXT DEFAULT NULL;

-- 2. Create user_integrations table (separate from profiles to keep secrets out of client reads)
CREATE TABLE IF NOT EXISTS user_integrations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bluesky_enabled BOOLEAN NOT NULL DEFAULT false,
  bluesky_handle TEXT,
  bluesky_app_password TEXT,
  bluesky_last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 3. RLS policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can read their own integration settings (excluding the app password)
CREATE POLICY "Users can read own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own integration settings
CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integration settings
CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Set up the Supabase webhook
-- Go to Supabase Dashboard > Database > Webhooks > Create a new webhook:
--   Name: bluesky-post
--   Table: bookmarks
--   Events: INSERT, UPDATE
--   URL: https://your-domain.com/api/bluesky
--   Headers: x-otter-webhook-secret = <your WEBHOOK_SECRET value>

-- 5. Add the WEBHOOK_SECRET to your Cloudflare Worker secrets:
--   npx wrangler secret put WEBHOOK_SECRET
