-- Create an automation queue table
CREATE TABLE IF NOT EXISTS automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('send_consultation_reminder', 'send_deposit_request', 'send_confirmation')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Function to queue automation messages on booking status change
CREATE OR REPLACE FUNCTION queue_automation_message()
RETURNS TRIGGER AS $$
BEGIN
  -- When moved to 'consultation_scheduled'
  IF NEW.status = 'consultation_scheduled' AND (OLD.status IS NULL OR OLD.status != 'consultation_scheduled') THEN
    INSERT INTO automation_queue (booking_id, action_type, scheduled_for)
    -- Schedule for 1 day before the consultation, or immediately if less than 1 day
    VALUES (
      NEW.id, 
      'send_consultation_reminder', 
      CASE WHEN NEW.start_time - interval '1 day' > now() THEN NEW.start_time - interval '1 day' ELSE now() END
    );
  END IF;

  -- When moved to 'pending_deposit'
  IF NEW.status = 'pending_deposit' AND (OLD.status IS NULL OR OLD.status != 'pending_deposit') THEN
    INSERT INTO automation_queue (booking_id, action_type, scheduled_for)
    VALUES (NEW.id, 'send_deposit_request', now());
  END IF;

  -- When moved to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    INSERT INTO automation_queue (booking_id, action_type, scheduled_for)
    VALUES (NEW.id, 'send_confirmation', now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking status changes
DROP TRIGGER IF EXISTS trg_queue_automation_message ON bookings;
CREATE TRIGGER trg_queue_automation_message
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION queue_automation_message();
