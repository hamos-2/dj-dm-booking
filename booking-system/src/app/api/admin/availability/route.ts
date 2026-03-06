
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const { schedule } = body;

    if (!schedule || !Array.isArray(schedule)) {
      return Response.json({ error: 'Invalid schedule data' }, { status: 400 });
    }

    // Upsert the schedule
    const { error } = await supabase
      .from('availability')
      .upsert(
        schedule.map((s: any) => ({
          day_of_week: s.day_of_week,
          is_active: s.is_active,
          start_time: s.start_time,
          end_time: s.end_time,
          slot_duration_minutes: s.slot_duration_minutes,
          buffer_minutes: s.buffer_minutes,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'day_of_week' }
      );

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('Save availability error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    return Response.json({ data });
  } catch (err: any) {
    console.error('Fetch availability error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
