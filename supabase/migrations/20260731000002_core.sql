-- 0002_core.sql
-- Buildings, users, guests, units, rate overrides.
--
-- Money is numeric(12,2) throughout. Never float — PHP amounts are compared
-- and summed for revenue reporting and must not drift.
-- Timestamps are timestamptz, stored UTC, displayed Asia/Manila.

-- ---------------------------------------------------------------------------
-- buildings
-- ---------------------------------------------------------------------------

create table buildings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- 'Serin West' | 'Serin East'
  address     text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- Staff and admin only. Guests never have accounts (spec 2 — guests use a
-- magic link). password_hash is nullable because Supabase Auth owns the
-- credential; the column exists for the spec's data model and for any future
-- self-hosted auth path.

create table users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          citext,
  phone          text,
  role           user_role not null,
  active         boolean not null default true,
  password_hash  text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create unique index users_email_unique on users (email) where deleted_at is null;
create index users_role_idx on users (role) where active and deleted_at is null;

-- ---------------------------------------------------------------------------
-- guests
-- ---------------------------------------------------------------------------
-- PERSONAL DATA (Philippine Data Privacy Act). Staff roles must never read
-- email or phone. Enforced by RLS in a later migration, not by the UI alone.

create table guests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       citext,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index guests_email_idx on guests (email);
create index guests_phone_idx on guests (phone);

-- ---------------------------------------------------------------------------
-- units
-- ---------------------------------------------------------------------------
-- DEVIATION FROM SPEC SECTION 4: `tower` is added.
--
-- The source data addresses units as "<tower>-<code>" (e.g. 2-919) and the
-- tower digit does NOT encode the building — 2-420 is West, 2-407 is East.
-- Unit code 517 exists in BOTH buildings. Without tower stored explicitly the
-- booking import cannot round-trip its own identifiers, and (building, code)
-- alone risks a silent collision if a tower ever repeats a unit number.
-- Uniqueness is therefore (building_id, tower, code).

create table units (
  id               uuid primary key default gen_random_uuid(),
  building_id      uuid not null references buildings (id),
  tower            smallint not null,
  code             text not null,            -- '919', '1407', '517'
  name             text,                     -- 'TANAW | Balcony Taal View 2 BR Suite'
  legacy_name      text,                     -- previous Airbnb listing title
  type             text not null,            -- 'studio' | 'exec_studio' | '1br' | '2br'
  floor            smallint,
  size_sqm         numeric(6,2),
  parking_slot     text,                     -- '2LG-121'; free text, mirrors source
  sleeping         text,                     -- '1kingbed, 1queenbed, 2floormatress'
  capacity         smallint not null,
  bedrooms         smallint not null default 0,
  baths            smallint not null default 1,
  light_cooking    text,                     -- 'yes' | 'no' | 'yes_outside'
  amenities        text[] not null default '{}',
  description      text,
  photos           text[] not null default '{}',
  photo_folder_url text,                     -- Google Drive folder from source sheet

  base_rate        numeric(12,2) not null,
  weekend_rate     numeric(12,2) not null,
  monthly_rate     numeric(12,2),
  cleaning_fee     numeric(12,2) not null default 0,
  extra_guest_fee  numeric(12,2) not null default 0,
  reservation_fee  numeric(12,2),            -- null = use global default (spec 3.5)
  max_guests       smallint not null,
  min_stay         smallint not null default 1,

  readiness        unit_readiness not null default 'ready',
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  constraint units_capacity_positive   check (capacity > 0),
  constraint units_max_guests_sane     check (max_guests >= capacity),
  constraint units_min_stay_positive   check (min_stay >= 1),
  constraint units_rates_non_negative  check (
    base_rate >= 0 and weekend_rate >= 0 and cleaning_fee >= 0
    and extra_guest_fee >= 0
    and (monthly_rate is null or monthly_rate >= 0)
    and (reservation_fee is null or reservation_fee >= 0)
  )
);

create unique index units_building_tower_code_unique
  on units (building_id, tower, code)
  where deleted_at is null;

create index units_active_idx on units (building_id) where active and deleted_at is null;

-- ---------------------------------------------------------------------------
-- rate_overrides
-- ---------------------------------------------------------------------------
-- ONE rule type only (spec 3.1): a flat rate for a unit over a date range,
-- for holidays and peak season. This is deliberately not a rules engine.
-- Ranges use [) semantics to match booking date maths.

create table rate_overrides (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references units (id) on delete cascade,
  start_date  date not null,
  end_date    date not null,                 -- exclusive
  rate        numeric(12,2) not null,
  min_stay    smallint,
  label       text,                          -- 'Holy Week 2027'
  created_at  timestamptz not null default now(),

  constraint rate_overrides_range_valid check (end_date > start_date),
  constraint rate_overrides_rate_non_negative check (rate >= 0),
  constraint rate_overrides_min_stay_positive check (min_stay is null or min_stay >= 1)
);

-- Two overrides must not cover the same night for the same unit, otherwise
-- pricing is non-deterministic and the public site and admin could disagree.
alter table rate_overrides
  add constraint rate_overrides_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(start_date, end_date, '[)') with &&
  );

create index rate_overrides_unit_idx on rate_overrides (unit_id, start_date);
