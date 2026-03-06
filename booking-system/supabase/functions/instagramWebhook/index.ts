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
    
    // Meta Webhooks format (Instagram Direct)
    if (body.object === 'instagram' || body.object === 'page') {
      console.log(`Processing ${body.entry.length} entries for object: ${body.object}`)
      
      for (const entry of body.entry) {
        // [AUTO-SAVE INSTAGRAM ACCOUNT ID]
        // entry.id is the Instagram Business Account ID that we need for the Reply API (Graph API URL).
        if (entry.id) {
          const { error: upsertError } = await supabase
            .from('integration_settings')
            .upsert({ 
              key: 'instagram_account_id', 
              value: entry.id,
              description: 'Auto-saved Instagram Business Account ID from webhook'
            }, { onConflict: 'key' });
            
          if (upsertError) {
             console.error('Failed to auto-save instagram_account_id:', upsertError);
          } else {
             console.log(`Auto-saved instagram_account_id: ${entry.id}`);
          }
        }

        // 1. Handle Messenger Platform format (entry.messaging)
        if (entry.messaging) {
          console.log(`Entry ${entry.id} has ${entry.messaging.length} messaging items.`)
          for (const messaging of entry.messaging) {
            if (messaging.message && messaging.message.text) {
               await saveMessage(supabase, messaging.sender.id, messaging.message.text)
            }
          }
        }
        
        // 2. Handle Instagram Graph API format (entry.changes)
        if (entry.changes) {
          console.log(`Entry ${entry.id} has ${entry.changes.length} changes.`)
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.message && change.value.message.text) {
              await saveMessage(supabase, change.value.sender.id, change.value.message.text)
            }
          }
        }

        if (!entry.messaging && !entry.changes) {
          console.log(`Entry ${entry.id} has neither messaging nor changes field. Skipping.`)
        }
      }
    } else {
      console.log(`Skipping webhook: object is "${body.object}", not "instagram" or "page"`)
    }
    
    return new Response('EVENT_RECEIVED', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return handleError(error)
  }
})

async function saveMessage(supabase: any, senderId: string, text: string) {
  console.log(`Found message from ${senderId}: "${text}"`)
  
  const { error } = await supabase
    .from('instagram_messages')
    .insert({
      instagram_user_id: senderId,
      message: text,
      status: 'unread',
      received_at: new Date().toISOString()
    })
  
  if (error) console.error('Error saving message:', error)
  else console.log(`Successfully saved message from @${senderId}`)
}
