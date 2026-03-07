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

const supabaseUser = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabaseUser.auth.signInWithPassword({ email: 'dj@test.com', password: 'password123' }).then((res) => {
    console.log("Sign in result:", res.error?.message || "SUCCESS");
    if (res.data?.session) {
        // Try invoking the edge function with the user JWT
        fetch(`${envVars.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/createBooking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${res.data.session.access_token}` },
            body: JSON.stringify({ customer_name: "Test", customer_email: "test@test.com", start_time: "2026-03-08T12:00:00Z", end_time: "2026-03-08T13:00:00Z", source: "instagram"})
        }).then(async r => console.log('Booking Result:', r.status, await r.text()));
    }
});
