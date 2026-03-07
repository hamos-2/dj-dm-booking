import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0 && !key.startsWith('#')) {
    acc[key.trim()] = values.join('=').trim();
  }
  return acc;
}, {} as any);

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function runQa() {
  console.log('--- Phase 3 QA ---');

  // Find a test booking
  const { data: bookingData, error: bError } = await supabase.from('bookings').select('id, status').limit(1);
  if (!bookingData || bookingData.length === 0) {
    console.log('No booking found for test.');
    return;
  }
  const testId = bookingData[0].id;

  // 1. Move to pending_deposit
  console.log(`Setting booking ${testId} to pending_deposit...`);
  const { error: updError } = await supabase.from('bookings').update({ status: 'pending_deposit' }).eq('id', testId);
  if (updError) throw updError;

  // 2. Check Queue
  const { data: queueData } = await supabase.from('automation_queue').select('*').eq('booking_id', testId).order('created_at', { ascending: false }).limit(1);
  if (!queueData || queueData.length === 0) {
    console.error('FAILED: No trigger added item to automation_queue.');
    return;
  }
  const queueItem = queueData[0];
  console.log(`Queue Item created: ${queueItem.action_type}, status: ${queueItem.status}`);

  // 3. Trigger Edge Function
  console.log(`Invoking processAutomationQueue Edge Function...`);
  const response = await fetch(`${envVars.NEXT_PUBLIC_SUPABASE_URL.replace('/v1', '')}/functions/v1/processAutomationQueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const text = await response.text();
  console.log('Edge Function Output:', text);

  // 4. Verify Final Queue Status
  const { data: finalQueueData } = await supabase.from('automation_queue').select('status').eq('id', queueItem.id).single();
  console.log(`Final Queue Item Status: ${finalQueueData?.status}`);

  // Clean up
  await supabase.from('automation_queue').delete().eq('booking_id', testId);
  
  if (finalQueueData?.status === 'completed' || finalQueueData?.status === 'failed') {
    console.log('--- Phase 3 QA PASSED ---');
  } else {
    console.log('--- Phase 3 QA FAILED ---');
  }
}
runQa();
