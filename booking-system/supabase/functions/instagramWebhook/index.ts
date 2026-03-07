import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request to ${req.url}`)
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Handle Instagram/Facebook webhooks verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    // 1. Check Deno.env first
    let verifyToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN')
    
    // 2. Fallback to DB
    if (!verifyToken) {
      const { data } = await supabase
        .from('integration_settings')
        .select('value')
        .eq('key', 'instagram_verify_token')
        .single()
      verifyToken = data?.value
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Verification Successful')
      return new Response(challenge, { status: 200 })
    } else {
      console.error('Webhook Verification Failed')
      return new Response('Forbidden', { status: 403 })
    }
  }

  // Handle incoming webhooks (POST)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Incoming Webhook Payload:', JSON.stringify(body, null, 2))
    
    // 3. Get Page Access Token for profile fetching - prioritize DB settings over env
    let pageAccessToken = null;
    let tokenData: any = null;
    let tokenError: any = null;
    let lastProfileResult: any = null;
    
    const result = await supabase
      .from('integration_settings')
      .select('key, value')
      .in('key', ['instagram_page_access_token', 'instagram_access_token'])
      .order('key', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    tokenData = result.data;
    tokenError = result.error;
    
    if (tokenData?.value) {
      pageAccessToken = tokenData.value;
      console.log(`Using token from DB: ${tokenData.key}`)
    } else {
      pageAccessToken = Deno.env.get('INSTAGRAM_PAGE_ACCESS_TOKEN');
      console.log(`Using token from ENV: ${pageAccessToken ? 'yes' : 'no'}`)
    }

    // Meta Webhooks format (Instagram Direct)
    if (body.object === 'instagram' || body.object === 'page') {
      console.log(`Processing ${body.entry.length} entries for object: ${body.object}`)
      
      for (const entry of body.entry) {
        // [AUTO-SAVE INSTAGRAM ACCOUNT ID]
        if (entry.id) {
          await supabase.from('integration_settings').upsert({ 
            key: 'instagram_account_id', 
            value: entry.id,
            description: 'Auto-saved Instagram Business Account ID from webhook'
          }, { onConflict: 'key' });
        }

        // 1. Handle Messenger Platform format (entry.messaging)
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            if (messaging.sender && messaging.sender.id === entry.id) continue;
            if (messaging.message && messaging.message.text) {
               lastProfileResult = await saveMessage(supabase, messaging.sender.id, messaging.message.text, pageAccessToken)
            }
          }
        }
        
        // 2. Handle Instagram Graph API format (entry.changes)
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value?.sender && change.value.sender.id === entry.id) continue;
            if (change.field === 'messages' && change.value.message && change.value.message.text) {
              lastProfileResult = await saveMessage(supabase, change.value.sender.id, change.value.message.text, pageAccessToken)
            }
          }
        }
      }
    }
    
    return new Response('EVENT_RECEIVED', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200 
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return handleError(error)
  }
})

async function saveMessage(supabase: any, senderId: string, text: string, pageAccessToken: string | null) {
  console.log(`Found message from ${senderId}: "${text}". Token provided: ${!!pageAccessToken}`)
  
  let profileResult = null;
  // 1. Try to fetch or updated user profile
  if (pageAccessToken) {
    profileResult = await updateInstagramUserProfile(supabase, senderId, pageAccessToken)
  }

  // 2. Save the message
  const { error } = await supabase
    .from('instagram_messages')
    .insert({
      instagram_user_id: senderId,
      message: text,
      status: 'unread',
      received_at: new Date().toISOString(),
      is_reply: false
    })
  
  if (error) console.error('Error saving message:', error)
  else console.log(`Successfully saved message from @${senderId}`)
  
  return profileResult;
}

async function updateInstagramUserProfile(supabase: any, senderId: string, pageAccessToken: string) {
  try {
    // Check if user was updated recently (within 24h)
    const { data: existing } = await supabase
      .from('instagram_users')
      .select('updated_at')
      .eq('instagram_user_id', senderId)
      .maybeSingle()

    if (existing) {
       const lastUpdate = new Date(existing.updated_at)
       const now = new Date()
       if (now.getTime() - lastUpdate.getTime() < 24 * 60 * 60 * 1000) {
         return { skipped: true, reason: 'recently updated' }
       }
    }

    console.log(`Fetching profile for ${senderId}...`)
    // Meta Graph API for IGSID (Instagram Scoped ID)
    // Fields: name, username, profile_pic
    const res = await fetch(`https://graph.facebook.com/v25.0/${senderId}?fields=name,username,profile_pic&access_token=${pageAccessToken}`)
    const profile = await res.json()
    
    if (profile.error) {
      console.error('Graph API Profile Error:', profile.error)
      return { success: false, error: profile.error }
    }

    const { error: upsertError } = await supabase
      .from('instagram_users')
      .upsert({
        instagram_user_id: senderId,
        name: profile.name || profile.username || null,
        profile_pic_url: profile.profile_pic || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'instagram_user_id' })

    if (upsertError) {
      console.error('Error upserting instagram_user:', upsertError)
      return { success: false, error: upsertError.message, profileFetched: profile }
    } else {
      console.log(`Updated profile for ${senderId}: ${profile.name || profile.username}`)
      return { success: true, name: profile.name || profile.username, profileFetched: profile }
    }
  } catch (err: any) {
    console.error('Failed to update Instagram user profile:', err)
    return { success: false, error: err.message }
  }
}
