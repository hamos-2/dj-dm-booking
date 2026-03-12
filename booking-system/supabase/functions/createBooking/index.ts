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
      source = 'web',
      tattoo_placement,
      estimated_size,
      notes,
      reference_image_urls,
      instagram_user_id
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

    // 3. Make sure Client exists if from Instagram
    let clientId = null;
    if (instagram_user_id) {
       // Check if client exists
       const { data: existingClient } = await supabaseClient
         .from('clients')
         .select('id')
         .eq('instagram_id', instagram_user_id)
         .maybeSingle();

       if (existingClient) {
          clientId = existingClient.id;
       } else {
          // Create client
          const { data: newClient, error: clientErr } = await supabaseClient
            .from('clients')
            .insert({
                name: customer_name,
                email: customer_email,
                phone: customer_phone,
                instagram_id: instagram_user_id
            })
            .select()
            .single();
          
          if (!clientErr && newClient) {
             clientId = newClient.id;
          }
       }
    }

    // 4. Insert into database
    const { data: bookingData, error: dbError } = await supabaseClient
      .from('bookings')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        source,
        status: 'inquiry',
        tattoo_placement,
        estimated_size,
        notes,
        google_event_id: googleEventId,
        client_id: clientId
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. Insert image references if any
    if (reference_image_urls && Array.isArray(reference_image_urls) && reference_image_urls.length > 0) {
       const imagesToInsert = reference_image_urls.map(url => ({
          booking_id: bookingData.id,
          image_url: url,
          type: 'reference'
       }));
       const { error: imageError } = await supabaseClient
          .from('images')
          .insert(imagesToInsert);
          
       if (imageError) console.error("Failed to insert images", imageError);
    }

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
