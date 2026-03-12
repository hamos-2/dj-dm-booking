CREATE TABLE IF NOT EXISTS specific_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  slots text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE specific_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read specific availability" 
  ON specific_availability FOR SELECT TO public 
  USING (true);

CREATE POLICY "Service role can manage specific availability" 
  ON specific_availability USING (true);
