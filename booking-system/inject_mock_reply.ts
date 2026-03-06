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
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function injectMockReply() {
  console.log('Injecting mock outbound reply...');
  
  const { error } = await adminClient.from('instagram_messages').insert({
    instagram_user_id: '896474086353270', // Known user ID from previous images
    message: 'Thanks for reaching out! We will get back to you soon. (Mock Reply)',
    status: 'read',
    is_reply: true,
  });

  if (error) {
    console.error('Failed to inject mock reply:', error);
  } else {
    console.log('Successfully injected mock reply!');
  }
}

injectMockReply();
