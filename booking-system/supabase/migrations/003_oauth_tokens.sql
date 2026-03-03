-- 003_oauth_tokens.sql

-- This table will store the Google OAuth tokens for the single admin account.
-- It should only ever have one or a few rows depending on how many calendars are linked.

CREATE TABLE oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expiry_date bigint NOT NULL, -- Unix timestamp in ms from Google API
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to their own oauth tokens" ON oauth_tokens 
  FOR ALL USING (auth.uid() = user_id);
