import { CalendarEvent } from '../../types/google';

const CALENDAR_API_BASEUrl = 'https://www.googleapis.com/calendar/v3';

async function fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API Error: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Gets events for a specific date range from the user's primary calendar
 */
export async function getEvents(
  accessToken: string,
  timeMin: string, // ISO8601 UTC
  timeMax: string  // ISO8601 UTC
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const data = await fetchWithAuth(
    `${CALENDAR_API_BASEUrl}/calendars/primary/events?${params.toString()}`,
    accessToken
  );

  return data.items || [];
}

/**
 * Creates a new event in the user's primary calendar
 */
export async function createEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: { email: string }[];
  }
) {
  return fetchWithAuth(`${CALENDAR_API_BASEUrl}/calendars/primary/events`, accessToken, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Updates an existing event
 */
export async function patchEvent(
  accessToken: string,
  eventId: string,
  updates: any
) {
  return fetchWithAuth(`${CALENDAR_API_BASEUrl}/calendars/primary/events/${eventId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Deletes an event
 */
export async function deleteEvent(accessToken: string, eventId: string) {
  const response = await fetch(
    `${CALENDAR_API_BASEUrl}/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Failed to delete event: ${response.status} ${errorText}`);
  }
  
  return true;
}
