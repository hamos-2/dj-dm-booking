import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.from('availability').insert({
    day_of_week: 99,
    start_time: '12:00',
    end_time: '13:00'
  }).select();

  return Response.json({ data, error });
}
