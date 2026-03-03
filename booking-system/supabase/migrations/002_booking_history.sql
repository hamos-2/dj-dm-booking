-- 002_booking_history.sql

CREATE TABLE booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_start_time timestamptz,
  old_end_time timestamptz,
  new_start_time timestamptz NOT NULL,
  new_end_time timestamptz NOT NULL,
  changed_by uuid REFERENCES auth.users(id), -- Auth ID of admin who changed it, or null
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to booking_history" ON booking_history 
  FOR ALL USING (auth.role() = 'authenticated');
