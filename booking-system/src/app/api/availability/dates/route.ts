import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch weekly availability
    const { data: avail } = await supabase.from('availability').select('*').eq('is_active', true);
    
    // Fetch specific overrides for future dates
    const today = new Date();
    const { data: specific } = await supabase
      .from('specific_availability')
      .select('*')
      .gte('date', today.toISOString().split('T')[0]);

    const activeDaysOfWeek = new Set(avail?.map(a => a.day_of_week) || []);
    const overrideDatesMap = new Map();
    specific?.forEach(s => overrideDatesMap.set(s.date, s.slots));

    const openDates = [];
    
    // Generate next 60 days
    for (let i = 0; i < 60; i++) {
       const date = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
       const offset = date.getTimezoneOffset() * 60000;
       const localDateStr = new Date(date.getTime() - offset).toISOString().split('T')[0];
       const dayOfWeek = date.getDay(); // 0-6

       // Check overrides first
       if (overrideDatesMap.has(localDateStr)) {
          const slots = overrideDatesMap.get(localDateStr);
          if (slots && slots.length > 0) {
             openDates.push(localDateStr);
          }
       } else {
          // Check standard weekly
          if (activeDaysOfWeek.has(dayOfWeek)) {
             openDates.push(localDateStr);
          }
       }
    }

    return Response.json({ openDates });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
