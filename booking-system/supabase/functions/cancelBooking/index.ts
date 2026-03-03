// cancelBooking/index.ts
import { serve } from "https://deno.land/std@0.182.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking_id } = await req.json()
    // 1. Fetch booking from Supabase by booking_id
    // 2. See if status is already 'canceled'. If so, return 400.
    // 3. Get Google Event ID from the booking record.
    // 4. Fetch Google OAuth Token for Admin.
    // 5. Invoke Google Calendar API to delete the event from the primary calendar.
    // 6. If deletion is successful, UPDATE Supabase `bookings` SET `status` = 'canceled'.
    
    return new Response(JSON.stringify({ success: true, message: "Booking canceled" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return handleError(error)
  }
})
