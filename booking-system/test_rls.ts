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
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function testAccess() {
  console.log('Testing with ANON key (this is what the browser uses):');
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: anonData, error: anonError } = await anonClient.from('instagram_messages').select('*');
  console.log('Anon Data (length):', anonData?.length || 0);
  console.log('Anon Data (raw):', anonData);
  if (anonError) console.error('Anon Error:', anonError);

  console.log('\nTesting with SERVICE ROLE key (bypasses RLS):');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: serviceData, error: serviceError } = await serviceClient.from('instagram_messages').select('*');
  console.log(`Service Role Data: Found ${serviceData?.length || 0} messages`);
  if (serviceError) console.error('Service Role Error:', serviceError);
}

testAccess();
