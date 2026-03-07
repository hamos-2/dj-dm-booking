import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function decodeJwt(token: string) {
    const parts = token.split('.');
    if (parts.length !== 3) return "invalid format";
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return { header, payload };
}

async function main() {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const envVars = env.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0 && !key.startsWith('#')) {
        acc[key.trim()] = values.join('=').trim();
    }
    return acc;
    }, {} as any);

    console.log("ANON_KEY:");
    console.log(decodeJwt(envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY));

    const supabaseUser = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const res = await supabaseUser.auth.signInWithPassword({ email: 'dj@test.com', password: 'password123' });
    if (res.data?.session) {
        console.log("USER_JWT:");
        console.log(decodeJwt(res.data.session.access_token));
    }
}
main();
