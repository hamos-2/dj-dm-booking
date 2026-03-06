
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the first available token record
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('provider_user_email, created_at')
    .eq('provider', 'google')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ 
    connected: !!data, 
    email: data?.provider_user_email || null 
  });
}
