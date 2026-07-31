-- 0003_bookings.sql
-- The single source of truth for occupancy, covering every source including
-- external OTA blocks and internal maintenance/owner blocks (spec 3.2).
--
-- This migration contains the most important line in the system: the
-- exclusion constraint that makes double-booking impossible at the database
-- level. Application-level checks are not acceptable on their own.

create table bookings (
  id                   uuid primary key default gen_random_uuid(),
  unit_id              uuid not null references units (id),

  -- Null for 'block' rows (maintenance / owner use) and for OTA blocks
  -- synced by iCal, which carry no guest identity.
  guest_id             uuid references guests (id),

  source               booking_source not null,
  external_ref         text,                 -- OTA confirmation code, or iCal UID
  channel_link_id      uuid,                 -- set by iCal sync; FK added in 0004

  check_in             date not null,
  check_out            date not null,        -- exclusive; see [) semantics below
  guests_count         smallint not null default 1,
  stay_type            stay_type not null default 'short',
  status               booking_status not null,

  gross_amount         numeric(12,2) not null default 0,
  reservation_fee      numeric(12,2) not null default 0,
  balance_due          numeric(12,2) not null default 0,
  balance_collected_at timestamptz,
  balance_waived_by    uuid references users (id),   -- admin waiver (spec 3.5)
  payment_state        payment_state not null default 'unpaid',

  commission_amount    numeric(12,2) not null default 0,
  net_amount           numeric(12,2) not null default 0,
  price_breakdown      jsonb,                -- itemised output of the pricing fn

  hold_expires_at      timestamptz,          -- pending_payment only
  magic_token          text,                 -- guest self-service link

  taken_by             text,                 -- 'April', 'Ate Jona', 'caretaker'
  notes                text,
  created_by           uuid references users (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,          -- soft delete; never hard-delete

  -- [) semantics: check_out is the first night NOT occupied, so a guest
  -- departing on the 5th and another arriving on the 5th do not collide.
  constraint bookings_dates_valid    check (check_out > check_in),
  constraint bookings_guests_positive check (guests_count > 0),
  constraint bookings_amounts_non_negative check (
    gross_amount >= 0 and reservation_fee >= 0 and commission_amount >= 0
  ),
  -- An internal block carries no guest identity and is always 'blocked'.
  -- OTA-synced blocks (airbnb/agoda) are unconstrained here: they legitimately
  -- have no guest, because iCal carries dates only.
  constraint bookings_block_shape check (
    source <> 'block' or (guest_id is null and status = 'blocked')
  )
);

create unique index bookings_magic_token_unique
  on bookings (magic_token) where magic_token is not null;

-- ---------------------------------------------------------------------------
-- THE CONSTRAINT
-- ---------------------------------------------------------------------------
-- Two bookings for the same unit may not cover the same night.
--
-- Statuses excluded from the predicate release their dates:
--   cancelled         — guest or admin cancelled
--   payment_rejected  — admin rejected the proof, dates go back on sale
--   expired           — hold lapsed, released by the background job
--
-- `no_show` is deliberately NOT excluded. Per the owner's decision, a no-show
-- night is written off and the unit stays blocked rather than being resold.
-- If that policy ever changes, add 'no_show' to this list — that single edit
-- is the whole behaviour change.
--
-- Soft-deleted rows are excluded so a deleted booking cannot hold dates.

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (
    status not in ('cancelled', 'payment_rejected', 'expired')
    and deleted_at is null
  );

-- ---------------------------------------------------------------------------
-- Indexes for the calendar, Today view, and reporting
-- ---------------------------------------------------------------------------

-- Timeline view: units × date window.
create index bookings_unit_dates_idx
  on bookings (unit_id, check_in, check_out)
  where deleted_at is null;

-- Today view: arrivals and departures.
create index bookings_check_in_idx  on bookings (check_in)  where deleted_at is null;
create index bookings_check_out_idx on bookings (check_out) where deleted_at is null;

-- Hold expiry job scans only live holds.
create index bookings_hold_expiry_idx
  on bookings (hold_expires_at)
  where status = 'pending_payment' and deleted_at is null;

-- Revenue by channel.
create index bookings_source_idx on bookings (source) where deleted_at is null;

create index bookings_guest_idx on bookings (guest_id);
