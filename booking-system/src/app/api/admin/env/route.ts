import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  try {
    let fileContent = '';
    try {
      fileContent = await fs.readFile(ENV_PATH, 'utf-8');
    } catch (e) {
      // If file doesn't exist, just return empty env
      return NextResponse.json({ env: {} });
    }
    const env: Record<string, string> = {};
    
    fileContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });

    return NextResponse.json({ env });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read .env.local', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { env } = await request.json();
    if (!env || typeof env !== 'object') {
      return NextResponse.json({ error: 'Invalid environment data' }, { status: 400 });
    }

    // Read current file to preserve comments if possible, but for simplicity 
    // and reliability, we'll recreate the structure requested by the user.
    
    const lines = [
      '# Supabase Local',
      `NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL || ''}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      `SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      '',
      '# Google OAuth',
      `GOOGLE_CLIENT_ID=${env.GOOGLE_CLIENT_ID || ''}`,
      `GOOGLE_CLIENT_SECRET=${env.GOOGLE_CLIENT_SECRET || ''}`,
      `GOOGLE_REDIRECT_URI=${env.GOOGLE_REDIRECT_URI || ''}`,
      '',
      '# App Configuration',
      `NEXT_PUBLIC_APP_URL=${env.NEXT_PUBLIC_APP_URL || ''}`,
      ''
    ];

    await fs.writeFile(ENV_PATH, lines.join('\n'));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to save .env.local', details: error.message }, { status: 500 });
  }
}
