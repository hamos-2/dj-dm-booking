// instagramWebhook/index.ts
import { serve } from "https://deno.land/std@0.182.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

serve(async (req) => {
  // Handle Instagram/Facebook webhooks verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    // Verify token from environment variables
    if (mode === 'subscribe' && token === Deno.env.get('INSTAGRAM_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // Handle incoming webhooks (POST)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // 1. Parse the incoming webhook payload from Instagram
    // 2. Extract sender_id (instagram_user_id) and text (message)
    // 3. Quick return 200 OK to avoid webhook timeouts (required by Meta)
    // 4. In the background (or before returning if fast enough), INSERT into `instagram_messages` table
    
    return new Response('EVENT_RECEIVED', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    })
  } catch (error) {
    return handleError(error)
  }
})
