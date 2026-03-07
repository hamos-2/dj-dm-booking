-- Alter ENUM type safely
-- We need to add new values to the existing booking_status ENUM
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'inquiry';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'consultation_scheduled';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_deposit';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
-- The 'confirmed' and 'canceled' values already exist.

-- Add new columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tattoo_placement text,
ADD COLUMN IF NOT EXISTS estimated_size text,
ADD COLUMN IF NOT EXISTS quoted_price integer,
ADD COLUMN IF NOT EXISTS deposit_amount integer,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS client_id uuid;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  instagram_id text,
  medical_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraint to bookings -> clients
ALTER TABLE bookings 
ADD CONSTRAINT fk_client
FOREIGN KEY (client_id) 
REFERENCES clients(id)
ON DELETE SET NULL;

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  type text NOT NULL CHECK (type IN ('reference', 'draft', 'final_work')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create storage bucket for CRM images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('crm_images', 'crm_images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'crm_images' );

CREATE POLICY "Authenticated users can upload images" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'crm_images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can update images" 
  ON storage.objects FOR UPDATE 
  USING ( bucket_id = 'crm_images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can delete images" 
  ON storage.objects FOR DELETE 
  USING ( bucket_id = 'crm_images' AND auth.role() = 'authenticated' );

-- RLS Policies for Tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to clients" ON clients 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
  
CREATE POLICY "Allow service role full access to clients" ON clients 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to images" ON images 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to images" ON images 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
