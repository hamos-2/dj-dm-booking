import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date) return Response.json({ error: "Date is required" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

    // 1. Fetch Specific Availability first
    const { data: specific } = await supabase
      .from('specific_availability')
      .select('slots')
      .eq('date', date)
      .single();

    const hasSpecificSlots = specific && specific.slots && specific.slots.length > 0;

    // 2. Fetch Availability (fallback)
    const { data: avail } = await supabase
      .from('availability')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hasSpecificSlots && (!avail || !avail.is_active)) {
      return Response.json({ slots: [] });
    }

    // 3. Fetch existing bookings
    const startUTC = new Date(Date.UTC(year, month - 1, day)).getTime() - (9 * 60 * 60 * 1000);
    const endUTC = startUTC + (24 * 60 * 60 * 1000) - 1;

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('status', 'confirmed')
      .gte('start_time', new Date(startUTC).toISOString())
      .lte('start_time', new Date(endUTC).toISOString());

    const slots = [];
    const duration = avail?.slot_duration_minutes || 60;
    const buffer = avail?.buffer_minutes || 15;
    const baseUTC = Date.UTC(year, month - 1, day) - (9 * 60 * 60 * 1000);

    if (hasSpecificSlots) {
       for (const timeStr of specific.slots) {
         try {
           const [h, m] = timeStr.split(':').map(Number);
           const sStartUTC = baseUTC + ((h * 60 + m) * 60 * 1000);
           const sEndUTC = sStartUTC + (duration * 60 * 1000);

           const sStartISO = new Date(sStartUTC).toISOString();
           const sEndISO = new Date(sEndUTC).toISOString();

           const isTaken = existingBookings?.some(b => {
             const bStart = new Date(b.start_time).getTime();
             const bEnd = new Date(b.end_time).getTime();
             return (sStartUTC < bEnd && bStart < sEndUTC);
           });

           if (!isTaken) {
             slots.push({ start: sStartISO, end: sEndISO });
           }
         } catch(e) { console.error('Error parsing time:', timeStr); }
       }
    } else {
       const [startH, startM] = avail.start_time.split(':').map(Number);
       const [endH, endM] = avail.end_time.split(':').map(Number);

       let currentMinutes = startH * 60 + startM;
       const endMinutes = endH * 60 + endM;

       while (currentMinutes + duration <= endMinutes) {
         const sStartUTC = baseUTC + (currentMinutes * 60 * 1000);
         const sEndUTC = sStartUTC + (duration * 60 * 1000);
         
         const sStartISO = new Date(sStartUTC).toISOString();
         const sEndISO = new Date(sEndUTC).toISOString();

         const isTaken = existingBookings?.some(b => {
           const bStart = new Date(b.start_time).getTime();
           const bEnd = new Date(b.end_time).getTime();
           return (sStartUTC < bEnd && bStart < sEndUTC);
         });

         if (!isTaken) {
           slots.push({ start: sStartISO, end: sEndISO });
         }

         currentMinutes += duration + buffer;
       }
    }

    return Response.json({ slots });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
