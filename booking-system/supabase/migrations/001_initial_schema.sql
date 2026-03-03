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
