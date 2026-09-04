ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_by text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_at timestamptz;
