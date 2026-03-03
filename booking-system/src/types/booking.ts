export type BookingStatus = 'confirmed' | 'canceled';

export interface Booking {
  id: string; // UUID
  user_id: string; // ID of the customer
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string; // ISO8601 UTC
  end_time: string; // ISO8601 UTC
  source: 'web' | 'instagram';
  status: BookingStatus;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingHistory {
  id: string; // UUID
  booking_id: string; // Refers to Booking.id
  old_start_time?: string;
  old_end_time?: string;
  new_start_time: string;
  new_end_time: string;
  changed_by: string; // Admin or user ID
  created_at: string;
}
