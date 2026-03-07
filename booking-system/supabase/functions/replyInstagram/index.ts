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
    // For Messenger Platform on Instagram (Graph API v25.0), we actually need to send
    // to the connected Facebook Page ID (or /me using Page Access Token) instead of the IG User ID.
    
    // Always fetch from database as the source of truth
    const { data: settings } = await supabase
      .from('integration_settings')
      .select('key, value')
      .in('key', ['instagram_page_access_token', 'instagram_access_token', 'facebook_page_id'])
    
    const pageTokenSetting = settings?.find((s: any) => s.key === 'instagram_page_access_token')
    const userTokenSetting = settings?.find((s: any) => s.key === 'instagram_access_token')
    const pageIdSetting = settings?.find((s: any) => s.key === 'facebook_page_id')
    
    let facebookPageId = pageIdSetting?.value || Deno.env.get('FACEBOOK_PAGE_ID') || '1018723694655500'
    let pageAccessToken = pageTokenSetting?.value

    // If no page token in DB but we have user token, exchange it
    if (!pageAccessToken && userTokenSetting?.value) {
      console.log('No Page Token found in DB. Attempting to exchange User Token for Page Token...')
      const exchangeUrl = `https://graph.facebook.com/v25.0/${facebookPageId}?fields=access_token&access_token=${userTokenSetting.value}`
      const exchangeRes = await fetch(exchangeUrl)
      const exchangeData = await exchangeRes.json()
      
      if (exchangeData.access_token) {
        pageAccessToken = exchangeData.access_token
        // Save it back to cache it
        await supabase.from('integration_settings').upsert({
           key: 'instagram_page_access_token',
           value: pageAccessToken,
           description: 'Auto-exchanged Facebook Page Access Token'
        }, { onConflict: 'key' })
      } else {
         console.error('Failed to exchange token:', exchangeData)
      }
    }
    
    // Fallback to env or whatever we have
    if (!pageAccessToken) {
      pageAccessToken = Deno.env.get('INSTAGRAM_PAGE_ACCESS_TOKEN') || userTokenSetting?.value
    }

    if (!pageAccessToken) {
      throw new Error('PAGE_ACCESS_TOKEN is missing or could not be generated. Please check your token settings.')
    }

    // 3. Send message via Graph API
    // Instagram Graph API endpoint format for Messaging (v25.0): https://graph.facebook.com/v25.0/{page-id}/messages
    const graphApiUrl = `https://graph.facebook.com/v25.0/${facebookPageId}/messages?access_token=${pageAccessToken}`
    
    console.log(`Sending to Graph API URL: https://graph.facebook.com/v25.0/${facebookPageId}/messages`)
    console.log(`Using Token starts with: ${pageAccessToken?.substring(0, 15)}...`)
    
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
    console.log(`Graph API Response Status: ${response.status}`)
    console.log(`Graph API Response Body: ${JSON.stringify(result)}`)

    if (!response.ok) {
      console.error('Failed to send Instagram message:', result)
      throw new Error(JSON.stringify({ 
        msg: result.error?.message || 'Failed to send message via Graph API',
        apiResponse: result,
        urlUsed: graphApiUrl,
        pageId: facebookPageId,
        tokenStart: pageAccessToken?.substring(0, 15)
      }))
    }

    console.log(`Successfully sent reply to ${recipient_id}`)

    // 4. Save the outbound message to the database
    const { error: dbError } = await supabase
      .from('instagram_messages')
      .insert({
        instagram_user_id: recipient_id,
        message: message_text,
        status: 'read', 
        is_reply: true,
        received_at: new Date().toISOString() 
      })

    if (dbError) console.error('Error saving outbound message:', dbError)

    return new Response(JSON.stringify({ success: true, messageId: result.message_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Reply function error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
