
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { date, timezone = "Asia/Seoul" } = await req.json()
    if (!date) throw new Error("Date is required")

    // Parse date (YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number)
    
    // Day of week (0-6)
    // We use UTC to get the day of week for the YYYY-MM-DD string safely
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay()

    // 1. Fetch Specific Availability first
    const { data: specific, error: specificError } = await supabaseClient
      .from('specific_availability')
      .select('slots')
      .eq('date', date)
      .single()

    const hasSpecificSlots = specific && specific.slots && specific.slots.length > 0;

    // 2. Fetch Availability (for settings like duration/buffer, or weekly fallback)
    const { data: avail, error: availError } = await supabaseClient
      .from('availability')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single()

    // If no specific slots AND standard weekly day is inactive/missing, return empty
    if (!hasSpecificSlots && (!avail || !avail.is_active)) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch existing bookings for this 24h window
    // Asia/Seoul is UTC+9. 
    // Local 00:00:00 is UTC 15:00:00 (of previous day)
    // Local 23:59:59 is UTC 14:59:59 (of current day)
    
    const startUTC = new Date(Date.UTC(year, month - 1, day)).getTime() - (9 * 60 * 60 * 1000)
    const endUTC = startUTC + (24 * 60 * 60 * 1000) - 1

    const { data: existingBookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('start_time, end_time')
      .eq('status', 'confirmed')
      .gte('start_time', new Date(startUTC).toISOString())
      .lte('start_time', new Date(endUTC).toISOString())

    if (bookingsError) throw bookingsError

    // 4. Generate Slots
    const slots = []
    const duration = avail?.slot_duration_minutes || 60
    const buffer = avail?.buffer_minutes || 15
    const baseUTC = Date.UTC(year, month - 1, day) - (9 * 60 * 60 * 1000)

    if (hasSpecificSlots) {
       // Use specific overrides
       for (const timeStr of specific.slots) {
         try {
           const [h, m] = timeStr.split(':').map(Number)
           const sStartUTC = baseUTC + ((h * 60 + m) * 60 * 1000)
           const sEndUTC = sStartUTC + (duration * 60 * 1000)

           const sStartISO = new Date(sStartUTC).toISOString()
           const sEndISO = new Date(sEndUTC).toISOString()

           // Overlap check
           const isTaken = existingBookings?.some(b => {
             const bStart = new Date(b.start_time).getTime()
             const bEnd = new Date(b.end_time).getTime()
             return (sStartUTC < bEnd && bStart < sEndUTC)
           })

           if (!isTaken) {
             slots.push({ start: sStartISO, end: sEndISO })
           }
         } catch(e) { console.error('Error parsing strict time:', timeStr) }
       }
    } else {
       // Regular generation
       const [startH, startM] = avail.start_time.split(':').map(Number)
       const [endH, endM] = avail.end_time.split(':').map(Number)

       let currentMinutes = startH * 60 + startM
       const endMinutes = endH * 60 + endM

       while (currentMinutes + duration <= endMinutes) {
         const sStartUTC = baseUTC + (currentMinutes * 60 * 1000)
         const sEndUTC = sStartUTC + (duration * 60 * 1000)
         
         const sStartISO = new Date(sStartUTC).toISOString()
         const sEndISO = new Date(sEndUTC).toISOString()

         // Overlap check
         const isTaken = existingBookings?.some(b => {
           const bStart = new Date(b.start_time).getTime()
           const bEnd = new Date(b.end_time).getTime()
           return (sStartUTC < bEnd && bStart < sEndUTC)
         })

         if (!isTaken) {
           slots.push({ start: sStartISO, end: sEndISO })
         }

         currentMinutes += duration + buffer
       }
    }

    return new Response(JSON.stringify({ slots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
