-- 001_initial_schema.sql
-- Users, availability, and bookings tables

-- 1. Create a custom enum for booking status
CREATE TYPE booking_status AS ENUM ('confirmed', 'canceled');

-- 2. Create the availability configuration table
CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active boolean NOT NULL DEFAULT true,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(day_of_week)
);

-- 3. Create the core bookings table
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id), -- Nullable for now, mainly to tracking admin interaction
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('web', 'instagram')),
  status booking_status NOT NULL DEFAULT 'confirmed',
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Draft - Admin Only for now)
-- The application will primarily use service roles in Edge Functions.
-- For the frontend admin dashboard, we can allow authenticated users (assuming they are the admin).
CREATE POLICY "Allow authenticated full access to availability" ON availability 
  FOR ALL USING (auth.role() = 'authenticated');
  
CREATE POLICY "Allow authenticated full access to bookings" ON bookings 
  FOR ALL USING (auth.role() = 'authenticated');
  
-- Allow public to select availability so the booking page can see the configuration
CREATE POLICY "Allow public read-only access to availability" ON availability 
  FOR SELECT USING (true);
-- 002_booking_history.sql

CREATE TABLE booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_start_time timestamptz,
  old_end_time timestamptz,
  new_start_time timestamptz NOT NULL,
  new_end_time timestamptz NOT NULL,
  changed_by uuid REFERENCES auth.users(id), -- Auth ID of admin who changed it, or null
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to booking_history" ON booking_history 
  FOR ALL USING (auth.role() = 'authenticated');
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
