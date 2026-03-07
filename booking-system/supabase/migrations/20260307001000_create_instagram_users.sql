-- migrations/20260307001000_create_instagram_users.sql
CREATE TABLE IF NOT EXISTS public.instagram_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instagram_user_id TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.instagram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to instagram_users"
    ON public.instagram_users FOR SELECT
    USING (true);

CREATE POLICY "Allow service role full access on instagram_users"
    ON public.instagram_users FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_users;
