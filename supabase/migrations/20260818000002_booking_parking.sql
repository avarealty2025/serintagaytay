-- Add parking fee fields to bookings table.
alter table bookings
  add column if not exists parking_fee      numeric(12,2) not null default 0,
  add column if not exists parking_fee_type text not null default 'one_time';
