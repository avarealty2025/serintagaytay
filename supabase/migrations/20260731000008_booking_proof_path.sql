-- Add payment proof path column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS proof_path text;
