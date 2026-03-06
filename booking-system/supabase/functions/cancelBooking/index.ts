
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getValidToken, deleteGoogleEvent } from "../_shared/google-calendar.ts"
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

    // 1. Fetch booking from Supabase
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) throw new Error("Booking not found")
    if (booking.status === 'canceled') throw new Error("Booking already canceled")

    // 2. Delete from Google Calendar if exists
    if (booking.google_event_id) {
      try {
        const accessToken = await getValidToken(supabaseClient)
        await deleteGoogleEvent(accessToken, booking.google_event_id)
        console.log('Google Calendar event deleted:', booking.google_event_id)
      } catch (gErr: any) {
        console.error('Failed to delete Google event:', gErr.message)
      }
    }

    // 3. Update status in DB
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', booking_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, message: "Booking canceled" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return handleError(error)
  }
})
