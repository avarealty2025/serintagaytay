-- 0001_extensions_and_enums.sql
-- Serin Tagaytay Staycation — foundation: extensions and enum types.
--
-- btree_gist is REQUIRED. The bookings exclusion constraint in 0003 uses
-- `unit_id WITH =` alongside `daterange WITH &&`. Plain gist cannot index
-- equality on a uuid; without this extension the constraint fails to create.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email columns

-- ---------------------------------------------------------------------------
-- Roles and people
-- ---------------------------------------------------------------------------

create type user_role as enum (
  'owner',
  'manager',
  'housekeeping',
  'caretaker',
  'maintenance'
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

-- 'block' is an internal, non-guest occupancy (maintenance, owner use).
-- 'manual' is a booking typed in by staff whose true origin is not an OTA.
create type booking_source as enum (
  'direct',
  'airbnb',
  'agoda',
  'facebook',
  'manual',
  'block'
);

-- Ordering here is not meaningful; do not rely on enum ordinality.
create type booking_status as enum (
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'payment_rejected',
  'expired',
  'no_show',
  'blocked'
);

create type payment_state as enum (
  'unpaid',
  'fee_paid',
  'paid_in_full'
);

create type stay_type as enum (
  'short',
  'long'
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create type payment_method as enum (
  'gcash',
  'bank',
  'cash',
  'ota'
);

create type payment_type as enum (
  'reservation_fee',
  'balance',
  'refund'
);

create type payment_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Channels
-- ---------------------------------------------------------------------------

-- Airbnb and Agoda only. Booking.com is deliberately out of scope for v1
-- (spec 3.7); it accounts for zero bookings in the imported source data.
create type channel as enum (
  'airbnb',
  'agoda'
);

create type sync_status as enum (
  'ok',
  'error'
);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create type task_type as enum (
  'housekeeping',
  'caretaker',
  'maintenance'
);

create type task_status as enum (
  'todo',
  'in_progress',
  'done'
);

create type task_trigger as enum (
  'on_checkout',
  'on_checkin'
);

-- Derived from tasks, not set by hand. See spec 3.6.
create type unit_readiness as enum (
  'dirty',
  'cleaning',
  'clean',
  'ready'
);
