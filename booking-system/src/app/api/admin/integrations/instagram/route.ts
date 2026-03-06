
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .ilike('key', 'instagram_%');

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

  const updates = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value)
  }));

  const { error } = await supabase
    .from('integration_settings')
    .upsert(updates, { onConflict: 'key' });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
