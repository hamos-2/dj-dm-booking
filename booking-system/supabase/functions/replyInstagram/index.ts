import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { recipient_id, message_text } = await req.json()

    if (!recipient_id || !message_text) {
      throw new Error('recipient_id and message_text are required')
    }

    // 2. Get Facebook Page / Instagram Account Access Details
    // For Instagram Messaging via Graph API, we need the specific Instagram Account ID (`{ig-user-id}/messages`).
    // Using `/me/messages` works for Messenger, but Instagram requires the explicit page or ig-user-id in newer versions.
    let pageAccessToken = Deno.env.get('INSTAGRAM_PAGE_ACCESS_TOKEN')
    let instagramAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID')
    
    // Fetch from database if not in environment variables
    if (!pageAccessToken || !instagramAccountId) {
      const { data: settings } = await supabase
        .from('integration_settings')
        .select('key, value')
        .in('key', ['instagram_page_access_token', 'instagram_access_token', 'instagram_account_id'])
      
      const tokenSetting = settings?.find(s => s.key === 'instagram_page_access_token' || s.key === 'instagram_access_token')
      const idSetting = settings?.find(s => s.key === 'instagram_account_id')
      
      if (tokenSetting?.value) pageAccessToken = tokenSetting.value
      if (idSetting?.value) instagramAccountId = idSetting.value
    }

    if (!pageAccessToken || !instagramAccountId) {
      throw new Error('INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID is missing. The webhook needs to receive at least one DM to auto-save the Account ID, or you must set it manually in integration_settings.')
    }

    // 3. Send message via Graph API
    // Instagram Graph API endpoint format: https://graph.facebook.com/v19.0/{ig-user-id}/messages
    const graphApiUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/messages?access_token=${pageAccessToken}`
    const response = await fetch(graphApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: {
          id: recipient_id,
        },
        message: {
          text: message_text,
        },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Failed to send Instagram message:', result)
      throw new Error(result.error?.message || 'Failed to send message via Graph API')
    }

    console.log(`Successfully sent reply to ${recipient_id}`)

    // 4. Save the outbound message to the database
    // Assuming we have added an `is_reply` boolean column to instagram_messages
    const { error: dbError } = await supabase
      .from('instagram_messages')
      .insert({
        instagram_user_id: recipient_id,
        message: message_text,
        status: 'read', // Outbound messages are inherently "read"
        is_reply: true,
        received_at: new Date().toISOString() // Or sent_at, reusing received_at for chronological ordering
      })

    if (dbError) {
      console.error('Error saving outbound message to database but message was sent:', dbError)
      // Even if saving fails, the message was sent successfully to Instagram, so we shouldn't fail the whole request
    }

    return new Response(JSON.stringify({ success: true, messageId: result.message_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Reply function error:', error)
    return handleError(error)
  }
})
