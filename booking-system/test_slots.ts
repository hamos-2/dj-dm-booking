import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0 && !key.startsWith('#')) {
    acc[key.trim()] = values.join('=').trim();
  }
  return acc;
}, {} as any);

async function main() {
    const res = await fetch(`${envVars.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/getAvailableSlots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ date: "2026-03-09" }) // A Monday (assuming 2026-03-09 is Mon)
    });
    console.log(res.status, await res.text());
}
main();
