import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function main() {
  const envVars = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((a: any, l) => {
    const [k, ...v] = l.split('=');
    if (k && !k.startsWith('#')) a[k.trim()] = v.join('=').trim();
    return a;
  }, {});
  
  const db = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Fetching specific_availability...");
  const res = await db.from('specific_availability').select('*').limit(1);
  console.log("Result:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
