-- Update RLS for public to view all flash designs (portfolio view)
DROP POLICY IF EXISTS "Public can view available flash designs" ON flash_designs;

CREATE POLICY "Public can view all flash designs" 
ON flash_designs FOR SELECT 
USING (true);
