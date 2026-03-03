// rescheduleBooking/index.ts
import { serve } from "https://deno.land/std@0.182.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking_id, new_start, new_end } = await req.json()
    // 1. Fetch original booking from Supabase.
    // 2. Fetch Availability config.
    // 3. Fetch Google OAuth Token for Admin.
    // 4. Check Google Calendar for overlap at `new_start` -> `new_end`, 
    //    EXTREMELY IMPORTANT: Ignore the `google_event_id` of the current booking (TC-006: Self-exclusion).
    // 5. If overlap exists, return 409 Conflict.
    // 6. If safe, Google Calendar API PATCH /calendars/primary/events/:eventId
    // 7. On success, UPDATE `bookings` (times) AND INSERT into `booking_history`.
    
    return new Response(JSON.stringify({ success: true, message: "Booking rescheduled" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return handleError(error)
  }
})
