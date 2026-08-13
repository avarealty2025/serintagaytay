-- Add external_id column for OTA iCal sync deduplication
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_external_id ON bookings(external_id) WHERE external_id IS NOT NULL;
