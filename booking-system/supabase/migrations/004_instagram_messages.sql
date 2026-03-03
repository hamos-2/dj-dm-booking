-- 004_instagram_messages.sql

CREATE TYPE message_status AS ENUM ('unread', 'read', 'booked');

CREATE TABLE instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_user_id text NOT NULL,
  message text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status message_status NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to instagram_messages" ON instagram_messages 
  FOR ALL USING (auth.role() = 'authenticated');
