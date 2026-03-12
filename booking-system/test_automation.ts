import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTest() {
  console.log("--- Starting Automation Queue Test ---")
  
  // 1. Fetch a real booking or create one
  const { data: bookings, error: bErr } = await supabase.from('bookings').select('id, status').limit(1)
  if (bErr || !bookings || bookings.length === 0) {
    console.error("Failed to fetch a booking to test with:", bErr)
    return
  }
  
  const testBooking = bookings[0]
  console.log(`Using Booking ID: ${testBooking.id} (Current status: ${testBooking.status})`)

  // 2. Change status to trigger automation_queue (e.g. from anything to 'pending_deposit')
  const newStatus = testBooking.status === 'pending_deposit' ? 'confirmed' : 'pending_deposit'
  console.log(`Updating booking status: ${testBooking.status} -> ${newStatus}...`)
  
  const { error: updErr } = await supabase.from('bookings').update({ status: newStatus }).eq('id', testBooking.id)
  if (updErr) {
    console.error("Failed to update booking status:", updErr)
    return
  }
  
  // 3. Check automation_queue for the new entry
  console.log("Checking automation_queue for a new pending entry...")
  // Wait a little bit for trigger to work although it should be synchronous in Postgres
  await new Promise(r => setTimeout(r, 1000))
  
  const { data: qData, error: qErr } = await supabase
    .from('automation_queue')
    .select('*')
    .eq('booking_id', testBooking.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  if (qErr) {
    console.error("Error querying automation_queue:", qErr)
    return
  }
  
  if (!qData || qData.length === 0) {
    console.error("Oops! The database trigger did not create an entry in automation_queue. Did you push migrations?")
    return
  }
  
  const queueItem = qData[0]
  console.log("✅ Trigger worked! Entry found in automation_queue:", queueItem)
  
  if (queueItem.status !== 'pending') {
    console.log(`Note: Queue item is in status '${queueItem.status}', not 'pending'. Make sure you trigger a new pending one or are checking the right row.`)
  }

  // 4. Test the processAutomationQueue Edge Function logic
  console.log("\n--- Now let's test fetching and processing the queue ---")
  
  // Actually we can just call the REST endpoint if it's deployed, but we can also
  // mock the edge function's logic directly to test the flow locally without setting up Deno.
  console.log(`Testing with Edge Function directly: it's supposed to fetch 'pending' items...`)
  
  // If the user wants to test the real edge function, we could do an HTTP call:
  // Assuming the user runs supabase local or we point to remote anon key
  const callRes = await fetch(`${supabaseUrl}/functions/v1/processAutomationQueue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (callRes.ok) {
    const data = await callRes.json()
    console.log("Edge Function Response Data:", data)
  } else {
    console.log("Edge Function responded with an error, maybe it's not deployed or accessible?", await callRes.text())
    console.log("\nSimulating local execution instead to show processing...")
  }
  
  // Let's manually check the result
  const { data: checkData } = await supabase.from('automation_queue').select('*').eq('id', queueItem.id).single()
  console.log(`Final state of the queue item: status=${checkData?.status}`)
  
  console.log("Test Complete.")
}

runTest().catch(console.error)
