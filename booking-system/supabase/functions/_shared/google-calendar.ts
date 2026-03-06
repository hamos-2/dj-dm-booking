
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Gets a valid access token for Google, refreshing if necessary.
 */
export async function getValidToken(supabaseClient: any) {
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'google')
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Google account not connected');
  }

  const { access_token, refresh_token, expiry_date } = tokenData;

  // Check if token is expired or expires in the next 5 minutes
  if (Date.now() + 300000 >= expiry_date) {
    console.log('Refreshing Google access token...');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Google credentials missing in environment');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const newData = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${newData.error_description || newData.error}`);
    }

    const newAccessToken = newData.access_token;
    const newExpiryDate = Date.now() + (newData.expires_in * 1000);

    // Update database
    await supabaseClient
      .from('oauth_tokens')
      .update({
        access_token: newAccessToken,
        expiry_date: newExpiryDate,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'google');

    return newAccessToken;
  }

  return access_token;
}

/**
 * Creates an event in Google Calendar.
 */
export async function createGoogleEvent(accessToken: string, booking: any) {
  const event = {
    summary: `[Booking] ${booking.customer_name}`,
    description: `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}\nPhone: ${booking.customer_phone || 'N/A'}\nSource: ${booking.source}`,
    start: {
      dateTime: new Date(booking.start_time).toISOString(),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: new Date(booking.end_time).toISOString(),
      timeZone: 'Asia/Seoul',
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`);
  }

  return data.id;
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteGoogleEvent(accessToken: string, eventId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const data = await response.json();
    throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`);
  }
}
