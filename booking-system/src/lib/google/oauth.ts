import { OAuthToken } from '../../types/google';

export async function refreshAccessToken(refreshToken: string): Promise<OAuthToken> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not found in environment');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    // Google doesn't always send a new refresh token. If it doesn't, keep the old one.
    refresh_token: data.refresh_token || refreshToken,
    // data.expires_in is the lifetime in seconds
    expiry_date: Date.now() + (data.expires_in * 1000),
  };
}
