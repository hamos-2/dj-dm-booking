export interface CalendarEvent {
  id: string;
  start: {
    dateTime?: string;
    date?: string; // used for all-day events
  };
  end: {
    dateTime?: string;
    date?: string; // used for all-day events
  };
}

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}
