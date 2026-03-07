
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .in('key', ['instagram_verify_token', 'instagram_access_token', 'facebook_page_id', 'facebook_page_name']);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Convert array to object
  const settings = data.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  return Response.json({ settings });
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { settings } = await req.json();

  let updates = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value)
  }));

  // Auto-fetch Facebook Page ID if a token is provided
  if (settings.instagram_access_token) {
    try {
      const fbReq = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${settings.instagram_access_token}`);
      const fbData = await fbReq.json();
      
      if (fbData.id) {
        updates.push({ key: 'facebook_page_id', value: fbData.id });
      }
      if (fbData.name) {
        updates.push({ key: 'facebook_page_name', value: fbData.name });
      }
    } catch (e) {
      console.error('Failed to auto-fetch page ID:', e);
    }
  }

  const { error } = await supabase
    .from('integration_settings')
    .upsert(updates, { onConflict: 'key' });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
