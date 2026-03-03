// googleOAuthCallback/index.ts
import { createClient } from "https://npm.esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    
    // 1. Call Google OAuth Token Endpoint to exchange `code` for `access_token` and `refresh_token`.
    //    Requires client_id, client_secret, redirect_uri.
    // 2. Using the Service Role Key, INSERT OR UPDATE the `oauth_tokens` table for the Admin user.
    // 3. Redirect the user back to the Admin Dashboard Settings page with a success flag.

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${Deno.env.get('NEXT_PUBLIC_APP_URL')}/admin/settings?success=true`
      }
    })
  } catch (error) {
    return handleError(error)
  }
})
