import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('flash_designs').select('*').limit(1);
  if (error) {
    console.error('Error fetching from flash_designs:', error.message);
  } else {
    console.log('Success! Table exists. Data:', data);
  }
}

check();
