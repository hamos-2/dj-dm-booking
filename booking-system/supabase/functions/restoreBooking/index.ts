
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getValidToken, createGoogleEvent } from "../_shared/google-calendar.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking_id } = await req.json()
    if (!booking_id) throw new Error("Missing booking_id")

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch booking
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) throw new Error("Booking not found")
    if (booking.status === 'confirmed') throw new Error("Booking already confirmed")

    // 2. Re-create in Google Calendar
    let googleEventId = null
    try {
      const accessToken = await getValidToken(supabaseClient)
      googleEventId = await createGoogleEvent(accessToken, {
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        start_time: booking.start_time,
        end_time: booking.end_time,
        source: booking.source
      })
      console.log('Google Calendar event re-created:', googleEventId)
    } catch (gErr: any) {
      console.error('Failed to sync with Google Calendar during restore:', gErr.message)
      // We proceed even if Google sync fails, but we won't have the event ID
    }

    // 3. Update status in DB
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'confirmed', 
        google_event_id: googleEventId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', booking_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Booking restored and synced",
      google_event_id: googleEventId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return handleError(error)
  }
})
