-- 20260304113000_update_oauth_tokens.sql
-- Update oauth_tokens table to support multi-provider and identifying the connected account email

ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'google';
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS provider_user_email text;
ALTER TABLE oauth_tokens ALTER COLUMN user_id DROP NOT NULL;

-- Add a unique constraint on provider if we only want one connection per provider
ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS oauth_tokens_user_id_key;
ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_provider_key UNIQUE (provider);
