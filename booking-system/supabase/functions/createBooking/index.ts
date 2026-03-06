import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getValidToken, createGoogleEvent } from "../_shared/google-calendar.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      customer_name, 
      customer_email, 
      customer_phone, 
      start_time, 
      end_time,
      source = 'web' 
    } = await req.json()

    if (!start_time || !end_time || !customer_name || !customer_email) {
      throw new Error("Missing required fields")
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Double check for conflicts (Atomic-ish check)
    const { data: existing, error: checkError } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('start_time', start_time)
      .eq('status', 'confirmed')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: "SLOT_ALREADY_TAKEN", message: "이미 예약된 시간대입니다." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      })
    }

    // 2. Sync with Google Calendar
    let googleEventId = null;
    let googleSyncError = null;
    try {
      const accessToken = await getValidToken(supabaseClient);
      googleEventId = await createGoogleEvent(accessToken, {
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        source
      });
      console.log('Google Calendar synced:', googleEventId);
    } catch (gErr: any) {
      console.error('Google Calendar Sync Failed:', gErr.message);
      googleSyncError = gErr.message;
    }

    // 3. Insert into database
    const { data: bookingData, error: dbError } = await supabaseClient
      .from('bookings')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        source,
        status: 'confirmed',
        google_event_id: googleEventId
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ 
      success: true, 
      booking: bookingData,
      googleSync: !!googleEventId,
      googleError: googleSyncError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
