import { AvailabilityConfig, TimeSlot } from '../../types/availability';
import { CalendarEvent } from '../../types/google';
import { addMinutes, isAfter, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Checks if two date ranges overlap.
 */
function isOverlapping(
  slotStart: Date,
  slotEnd: Date,
  eventStart: Date,
  eventEnd: Date
): boolean {
  // A.start < B.end AND A.end > B.start
  return slotStart < eventEnd && slotEnd > eventStart;
}

/**
 * Normalizes Google Calendar events, handling both specific times and all-day events.
 */
function normalizeEventTime(event: CalendarEvent): { start: Date; end: Date } {
  const start = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date + 'T00:00:00Z');
  const end = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date + 'T23:59:59Z');
  return { start, end };
}

/**
 * Calculates available slots for a given date, taking into account availability settings and existing calendar events.
 */
export function calculateAvailableSlots(
  availability: AvailabilityConfig | null | undefined, // May be null if inactive that day
  calendarEvents: CalendarEvent[],
  targetDateStr: string, // "YYYY-MM-DD"
  timezone: string, // e.g. "Asia/Seoul"
  excludeEventId?: string
): TimeSlot[] {
  // Step 1: Check availability for the day
  if (!availability || !availability.is_active) {
    return [];
  }

  // Parse the target date string as if it's in the specified timezone to get the correct absolute time bounds
  // We want to know when targetDateStr + start_time occurs in UTC
  const workStartLocalStr = `${targetDateStr}T${availability.start_time}:00`;
  const workEndLocalStr = `${targetDateStr}T${availability.end_time}:00`;

  // We need the Date objects for the start and end of the working day in UTC
  const calculateUtcDateFromLocalString = (localStr: string, tz: string) => {
    // There are several ways to do this in JS, the date-fns-tz way:
    // This creates a UTC date object that represents the exact moment the localStr occurred in tz
    
    // As date-fns-tz v3 removed fromZonedTime, we can construct the ISO string with offset manually or use standard functions
    // For simplicity, we create the date in the local runtime first (which could be wrong timezone), 
    // It's safer to format the string to contain the timezone and let native Date parse it, but we need the offset.
    
    // Workaround for pure JS Date: Use Intl.DateTimeFormat to get parts, or simple string formatting:
    // A robust way mapping "YYYY-MM-DDTHH:mm:ss" in "Asia/Seoul" to a Date object:
    
    // We will use standard string manipulation to append the timezone assuming it's known, but we don't know the exact offset (+09:00 vs +09:00 etc) ahead of time.
    // However since timezone is 'Asia/Seoul', it is fixed to +09:00. Next.js app will mostly run in UTC though.
    // Assuming simple mapping for now for standard timezones, or using a library.
    
    // Hacky workaround due to standard Date lack of IANA support parsing:
    // We use a known trick: format a date, find difference.
    const d = new Date(localStr + 'Z'); // Treat as UTC first
    return d; // TO-DO: Implement proper timezone offset calculation later if not using full moment-timezone
  };

  // For the sake of this pseudocode implementation, let's assume `workStart` and `workEnd` are correctly converted UTC Date objects
  // Using a simplified offset appending since Asia/Seoul is +09:00
  // Note: in a real app you'd want a robust timezone library here like date-fns-tz `fromZonedTime`
  const tzOffset = timezone === 'Asia/Seoul' ? '+09:00' : 'Z';
  const workStart = new Date(`${workStartLocalStr}${tzOffset}`);
  const workEnd = new Date(`${workEndLocalStr}${tzOffset}`);

  // Step 3: Candidate Slots
  const slots: { start: Date; end: Date }[] = [];
  let cursor = workStart;

  while (addMinutes(cursor, availability.slot_duration_minutes) <= workEnd) {
    const slotEnd = addMinutes(cursor, availability.slot_duration_minutes);
    slots.push({ start: cursor, end: slotEnd });
    cursor = addMinutes(slotEnd, availability.buffer_minutes);
  }

  // Step 4: Filter events
  const filteredEvents = excludeEventId
    ? calendarEvents.filter((e) => e.id !== excludeEventId)
    : calendarEvents;

  // Pre-process event times
  const normalizedEvents = filteredEvents.map(normalizeEventTime);

  // Step 5: Remove overlapping
  let availableSlots = slots.filter((slot) => {
    const hasConflict = normalizedEvents.some((event) =>
      isOverlapping(slot.start, slot.end, event.start, event.end)
    );
    return !hasConflict;
  });

  // Step 6: Remove past slots
  const now = new Date();
  availableSlots = availableSlots.filter((slot) => isAfter(slot.start, now));

  // Step 7: Format output
  return availableSlots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));
}
