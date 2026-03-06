import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/admin/settings?error=no_code', request.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials not configured in .env.local');
    }

    // 1. Exchange code for tokens directly in Next.js
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || tokens.error || 'Failed to exchange token');
    }

    // 2. Get user info (to get email)
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userResponse.json();

    // 3. Save to Supabase using Service Role Key
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tokenData: any = {
      provider: 'google',
      provider_user_email: userInfo.email,
      access_token: tokens.access_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000),
      updated_at: new Date().toISOString()
    };

    if (tokens.refresh_token) {
      tokenData.refresh_token = tokens.refresh_token;
    }

    const { error: dbError } = await supabase
      .from('oauth_tokens')
      .upsert(tokenData, { onConflict: 'provider' });

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/admin/settings?success=google_connected', request.url));
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    const errorMsg = error.message || 'Unknown error occurred';
    return NextResponse.redirect(new URL(`/admin/settings?error=${encodeURIComponent(errorMsg)}`, request.url));
  }
}
