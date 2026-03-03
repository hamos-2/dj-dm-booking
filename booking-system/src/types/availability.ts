export interface AvailabilityConfig {
  id: string;
  day_of_week: number; // 0 (Sun) ~ 6 (Sat)
  is_active: boolean;
  start_time: string; // "09:00"
  end_time: string; // "18:00"
  slot_duration_minutes: number; // 60
  buffer_minutes: number; // 15
}

export interface TimeSlot {
  start: string; // ISO8601
  end: string; // ISO8601
}
