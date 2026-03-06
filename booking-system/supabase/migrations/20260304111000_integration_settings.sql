
-- 005_integration_settings.sql

CREATE TABLE IF NOT EXISTS integration_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to integration_settings" 
ON integration_settings FOR ALL 
USING (auth.role() = 'authenticated');

-- Insert default placeholder for Instagram if not exists
INSERT INTO integration_settings (key, value, description)
VALUES 
('instagram_verify_token', 'default_verify_token', 'Token used for Instagram Webhook verification handshake'),
('instagram_access_token', '', 'Long-lived access token for Instagram Meta Graph API')
ON CONFLICT (key) DO NOTHING;
