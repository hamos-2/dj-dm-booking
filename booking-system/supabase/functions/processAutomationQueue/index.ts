import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Ensure only authorized requests or the scheduled runner can execute this
    // We can use a simple bearer token for security or let Supabase's built-in auth handle it.
    // For now, assuming this will be triggered either manually or via pg_net/cron.

    // 1. Fetch pending tasks
    const { data: queueItems, error: fetchError } = await supabase
      .from('automation_queue')
      .select('*, bookings(*, clients(*))')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10) // Process in small batches

    if (fetchError) {
      throw new Error(`Failed to fetch queue item: ${fetchError.message}`)
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending tasks to process.' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200
      })
    }

    // Prepare credentials for Instagram if needed
    const { data: settings } = await supabase
      .from('integration_settings')
      .select('key, value')
      .in('key', ['instagram_page_access_token', 'instagram_access_token', 'facebook_page_id'])
    
    // Process each task
    const results = []

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase.from('automation_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', item.id)

        const booking = item.bookings
        const client = booking?.clients

        let success = false
        let messageText = ''

        // Generate message based on action_type
        if (item.action_type === 'send_consultation_reminder') {
          messageText = `안녕하세요 ${booking.customer_name}님! 내일 타투 상담 예약 알림입니다.\n예약 시간: ${new Date(booking.start_time).toLocaleString('ko-KR')}\n확인 부탁드립니다.`
        } else if (item.action_type === 'send_deposit_request') {
          const deposit = booking.deposit_amount || 0
          messageText = `안녕하세요 ${booking.customer_name}님, 예약금 ${deposit}원 입금 부탁드립니다.\n입금 확인 후 예약이 확정됩니다.`
        } else if (item.action_type === 'send_confirmation') {
          messageText = `${booking.customer_name}님, 예약이 최종 확정되었습니다! 예약 시간에 뵙겠습니다.`
        } else {
           throw new Error(`Unknown action type: ${item.action_type}`)
        }

        // Send via Instagram DM if applicable
        if (booking.source === 'instagram' && client?.instagram_id) {
           success = await sendInstagramDM(client.instagram_id, messageText, settings, supabase)
        } else {
           // Fallback / Other channels like SMS/Email would go here
           // For now, if there's no instagram_id or source is not instagram, we skip or assume success (e.g., manual handling).
           console.log(`No Instagram ID for booking ${booking.id}, skipping actual send.`)
           success = true // We mark it true so it completes, or we could set it to failed if mandatory
        }

        // Update status
        if (success) {
           await supabase.from('automation_queue').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', item.id)
           results.push({ id: item.id, status: 'completed' })
        } else {
           await supabase.from('automation_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', item.id)
           results.push({ id: item.id, status: 'failed' })
        }

      } catch (err: any) {
        console.error(`Error processing item ${item.id}`, err)
        await supabase.from('automation_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', item.id)
        results.push({ id: item.id, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({ message: 'Processed queue', results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

async function sendInstagramDM(recipientId: string, messageText: string, settings: any[], supabase: any) {
    const pageTokenSetting = settings?.find((s: any) => s.key === 'instagram_page_access_token')
    const userTokenSetting = settings?.find((s: any) => s.key === 'instagram_access_token')
    const pageIdSetting = settings?.find((s: any) => s.key === 'facebook_page_id')
    
    let facebookPageId = pageIdSetting?.value || Deno.env.get('FACEBOOK_PAGE_ID')
    let pageAccessToken = pageTokenSetting?.value

    if (!pageAccessToken && userTokenSetting?.value) {
      const exchangeUrl = `https://graph.facebook.com/v25.0/${facebookPageId}?fields=access_token&access_token=${userTokenSetting.value}`
      const exchangeRes = await fetch(exchangeUrl)
      const exchangeData = await exchangeRes.json()
      
      if (exchangeData.access_token) {
        pageAccessToken = exchangeData.access_token
        await supabase.from('integration_settings').upsert({
           key: 'instagram_page_access_token',
           value: pageAccessToken,
           description: 'Auto-exchanged Facebook Page Access Token'
        }, { onConflict: 'key' })
      }
    }

    if (!pageAccessToken) {
      pageAccessToken = Deno.env.get('INSTAGRAM_PAGE_ACCESS_TOKEN') || userTokenSetting?.value
    }

    if (!pageAccessToken || !facebookPageId) {
      throw new Error('Tokens or Page ID missing')
    }

    const graphApiUrl = `https://graph.facebook.com/v25.0/${facebookPageId}/messages?access_token=${pageAccessToken}`
    
    const response = await fetch(graphApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
       console.error("IG DM Error", result)
       return false
    }

    // Log the message
    await supabase.from('instagram_messages').insert({
      instagram_user_id: recipientId,
      message: messageText,
      status: 'read', 
      is_reply: true,
      received_at: new Date().toISOString() 
    })

    return true
}
