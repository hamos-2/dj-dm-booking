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

async function checkColumn() {
  const { data, error } = await adminClient.from('instagram_messages').select('is_reply').limit(1);
  if (error) {
    if (error.code === 'PGRST204') {
        console.log('COLUMN DOES NOT EXIST YET OR CACHE NEEDS RELOAD');
    } else {
        console.error('API Error:', error);
    }
  } else {
    console.log('COLUMN EXISTS!');
  }
}

checkColumn();
