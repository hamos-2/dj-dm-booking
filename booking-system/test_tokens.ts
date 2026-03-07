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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function testEdgeFunction() {
  console.log('Testing createBooking with ANON_KEY...');
  const resAnon = await fetch(`${supabaseUrl}/functions/v1/createBooking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      customer_name: "Test Anon",
      customer_email: "anon@test.com",
      start_time: "2026-03-08T12:00:00.000Z",
      end_time: "2026-03-08T13:00:00.000Z",
      source: "insta"
    })
  });
  console.log('ANON_KEY Status:', resAnon.status, await resAnon.text());

  console.log('\nTesting createBooking with SERVICE_ROLE_KEY...');
  const resService = await fetch(`${supabaseUrl}/functions/v1/createBooking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
      customer_name: "Test Service",
      customer_email: "service@test.com",
      start_time: "2026-03-08T14:00:00.000Z",
      end_time: "2026-03-08T15:00:00.000Z",
      source: "insta"
    })
  });
  console.log('SERVICE_ROLE_KEY Status:', resService.status, await resService.text());

  // Test with user session JWT
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  if (users?.users?.length > 0) {
    const user = users.users[0];
    
    // We cannot easily get a fresh user session JWT without sign in, but we can sign in!
    const supabaseUser = createClient(supabaseUrl, anonKey);
    const { data: authData, error } = await supabaseUser.auth.signInWithPassword({
        email: 'test_signup@test.com', // or dj@test.com
        password: 'password123'
    });

    if (error && error.message !== 'Invalid login credentials') {
        const {data: authData2} = await supabaseUser.auth.signInWithPassword({
            email: 'dj@test.com',
            password: 'password123'
        });
        if (authData2?.session) {
            console.log('\nTesting createBooking with fresh User JWT...');
            const resUser = await fetch(`${supabaseUrl}/functions/v1/createBooking`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authData2.session.access_token}`
                },
                body: JSON.stringify({
                  customer_name: "Test User",
                  customer_email: "user@test.com",
                  start_time: "2026-03-08T16:00:00.000Z",
                  end_time: "2026-03-08T17:00:00.000Z",
                  source: "insta"
                })
              });
              console.log('User JWT Status:', resUser.status, await resUser.text());
        }
    } else if (authData?.session) {
        console.log('\nTesting createBooking with fresh User JWT...');
        const resUser = await fetch(`${supabaseUrl}/functions/v1/createBooking`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.session.access_token}`
            },
            body: JSON.stringify({
              customer_name: "Test User",
              customer_email: "user@test.com",
              start_time: "2026-03-08T16:00:00.000Z",
              end_time: "2026-03-08T17:00:00.000Z",
              source: "insta"
            })
          });
          console.log('User JWT Status:', resUser.status, await resUser.text());
    } else {
        console.log('\nCould not sign in to test User JWT.');
    }
  }

}

testEdgeFunction();
