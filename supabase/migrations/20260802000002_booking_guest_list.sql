-- Add guest_list column for condo endorsement — stores names of all guests staying
alter table bookings add column if not exists guest_list text[] default '{}';
