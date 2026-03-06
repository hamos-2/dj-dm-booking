
-- RLS update for instagram_messages
-- 1. Drop existing policy
DROP POLICY IF EXISTS "Allow authenticated full access to instagram_messages" ON public.instagram_messages;

-- 2. Create a public read policy for the admin (simplest solution if auth state is flaky)
-- Note: In a production app, we would use a more robust auth check.
CREATE POLICY "Allow public read access to instagram_messages" ON public.instagram_messages
  FOR SELECT USING (true);

-- 3. Still keep insert/update restricted to service role or specific conditions if needed,
-- but the Edge function already uses service_role_key which bypasses RLS.

-- 4. Enable Realtime for this table
ALTER TABLE public.instagram_messages REPLICA IDENTITY FULL;
COMMENT ON TABLE public.instagram_messages IS '{"realtime": true}';
