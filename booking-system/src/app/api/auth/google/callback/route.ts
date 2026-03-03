import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/admin/settings?error=no_code', request.url));
  }

  // 이 엔드포인트는 Supabase Edge Function (googleOAuthCallback)으로 코드를 넘겨서 
  // 토큰을 교환하고 DB에 저장하도록 브릿지 역할을 합니다.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서버측에서 실행되므로 service_role 권장

    const response = await fetch(\`\${supabaseUrl}/functions/v1/googleOAuthCallback\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${supabaseKey}\`
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'Failed to exchange token');

    return NextResponse.redirect(new URL('/admin/settings?success=google_connected', request.url));
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.redirect(new URL(\`/admin/settings?error=\${encodeURIComponent(error.message)}\`, request.url));
  }
}
