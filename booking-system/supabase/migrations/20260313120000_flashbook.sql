-- Flashbook Feature Migration
CREATE TABLE IF NOT EXISTS flash_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric,
  size text,
  body_placement_suggestion text,
  is_available boolean DEFAULT true,
  image_url text NOT NULL,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add flash_id to bookings to track which design was booked
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS flash_id uuid REFERENCES flash_designs(id) ON DELETE SET NULL;

-- Create storage bucket for flash designs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flash-designs', 'flash-designs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Table
ALTER TABLE flash_designs ENABLE ROW LEVEL SECURITY;

-- Anyone can view available flash designs
DROP POLICY IF EXISTS "Public can view available flash designs" ON flash_designs;
CREATE POLICY "Public can view available flash designs" 
ON flash_designs FOR SELECT 
USING (is_available = true);

-- Admins/Authenticated users can do everything
DROP POLICY IF EXISTS "Authenticated users can view all flash designs" ON flash_designs;
CREATE POLICY "Authenticated users can view all flash designs" 
ON flash_designs FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert flash designs" ON flash_designs;
CREATE POLICY "Authenticated users can insert flash designs" 
ON flash_designs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update flash designs" ON flash_designs;
CREATE POLICY "Authenticated users can update flash designs" 
ON flash_designs FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete flash designs" ON flash_designs;
CREATE POLICY "Authenticated users can delete flash designs" 
ON flash_designs FOR DELETE 
USING (auth.role() = 'authenticated');

-- Additional policy for service role (admin API bypass)
DROP POLICY IF EXISTS "Service role full access flash designs" ON flash_designs;
CREATE POLICY "Service role full access flash designs" 
ON flash_designs FOR ALL 
USING (true) WITH CHECK (true);

-- RLS Policies for Storage Bucket
DROP POLICY IF EXISTS "Public Access Flash Images" ON storage.objects;
CREATE POLICY "Public Access Flash Images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'flash-designs' );

DROP POLICY IF EXISTS "Auth Upload Flash Images" ON storage.objects;
CREATE POLICY "Auth Upload Flash Images" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'flash-designs' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Auth Update Flash Images" ON storage.objects;
CREATE POLICY "Auth Update Flash Images" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'flash-designs' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Auth Delete Flash Images" ON storage.objects;
CREATE POLICY "Auth Delete Flash Images" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'flash-designs' AND auth.role() = 'authenticated' );
