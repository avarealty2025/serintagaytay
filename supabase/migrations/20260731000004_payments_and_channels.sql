-- 0004_payments_and_channels.sql
-- Payments (reservation fee + balance on arrival), iCal channel links,
-- and sync conflict records.

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
-- Every direct booking has TWO payments (spec 3.5): a fixed reservation fee
-- paid to confirm, and the balance collected on arrival.
--
-- proof_url points at a PRIVATE Supabase Storage bucket. These images contain
-- guest names and partial account numbers and are served only via signed URLs.
-- Never a public bucket.

create table payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings (id),
  method        payment_method not null,
  type          payment_type not null,
  amount        numeric(12,2) not null,
  reference     text,                        -- GCash ref / bank trace no.
  proof_url     text,                        -- private bucket object path
  status        payment_status not null default 'pending',

  collected_by  uuid references users (id),  -- caretaker who took the cash
  approved_by   uuid references users (id),  -- admin who approved the proof
  approved_at   timestamptz,

  -- Cash held by staff until handed over. Null = still in that person's
  -- pocket and counted in the "cash held by staff" total (spec 3.8).
  remitted_at   timestamptz,
  remitted_to   uuid references users (id),

  notes         text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,                 -- financial: soft delete only

  -- Refunds are recorded as negative amounts; everything else is positive.
  constraint payments_amount_signed check (
    (type = 'refund' and amount < 0) or (type <> 'refund' and amount > 0)
  ),
  -- Only cash can be "held" by a person and later remitted.
  constraint payments_remittance_is_cash check (
    remitted_at is null or method = 'cash'
  )
);

create index payments_booking_idx on payments (booking_id) where deleted_at is null;

-- Drives the mobile approval queue (spec 3.5).
create index payments_pending_idx
  on payments (created_at)
  where status = 'pending' and deleted_at is null;

-- Drives the "cash held by staff" report.
create index payments_cash_held_idx
  on payments (collected_by)
  where method = 'cash' and remitted_at is null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- channel_links
-- ---------------------------------------------------------------------------
-- One row per unit per channel. ical_import_url is what we PULL (the OTA's
-- calendar). ical_export_token is the secret in the URL we PUBLISH for that
-- unit, which the owner pastes into the OTA so our direct bookings block
-- theirs.
--
-- SECURITY: both columns are secret-bearing. The import URLs carry an Airbnb
-- `?t=` token that grants read access to that unit's booking dates, and the
-- export token grants the same over our own calendar. Neither belongs in a
-- shared document, a screenshot, or a client-side bundle.

create table channel_links (
  id                 uuid primary key default gen_random_uuid(),
  unit_id            uuid not null references units (id) on delete cascade,
  channel            channel not null,
  ical_import_url    text,
  ical_export_token  text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  active             boolean not null default true,

  last_synced_at     timestamptz,            -- last SUCCESSFUL sync
  last_attempt_at    timestamptz,            -- last run, success or failure
  last_sync_status   sync_status,
  last_error         text,
  consecutive_failures integer not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index channel_links_unit_channel_unique
  on channel_links (unit_id, channel);

create unique index channel_links_export_token_unique
  on channel_links (ical_export_token);

-- Sync health screen: stale feeds first.
create index channel_links_stale_idx
  on channel_links (last_synced_at)
  where active;

-- Deferred FK from bookings, now that channel_links exists.
alter table bookings
  add constraint bookings_channel_link_fk
  foreign key (channel_link_id) references channel_links (id) on delete set null;

-- An external booking is identified by its iCal UID within a feed. This makes
-- the sync idempotent: re-importing the same feed updates rather than
-- duplicating.
create unique index bookings_external_ref_unique
  on bookings (channel_link_id, external_ref)
  where channel_link_id is not null and external_ref is not null;

-- ---------------------------------------------------------------------------
-- sync_conflicts
-- ---------------------------------------------------------------------------
-- Raised when an incoming OTA block overlaps a booking we already hold.
-- This is the entire value of the sync feature: catching it within the hour
-- instead of on arrival day (spec 3.7). Emails the owner immediately.

create table sync_conflicts (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references units (id),
  channel           channel not null,
  channel_link_id   uuid references channel_links (id) on delete set null,
  conflicting_range daterange not null,
  booking_id        uuid references bookings (id),   -- the booking we'd break
  external_ref      text,                            -- the incoming iCal UID
  resolved          boolean not null default false,
  resolved_by       uuid references users (id),
  resolved_at       timestamptz,
  resolution_note   text,
  notified_at       timestamptz,                     -- owner email sent
  created_at        timestamptz not null default now()
);

create index sync_conflicts_open_idx
  on sync_conflicts (created_at)
  where not resolved;

-- ---------------------------------------------------------------------------
-- sync_runs
-- ---------------------------------------------------------------------------
-- Per-feed failure isolation requires per-feed logging: one dead URL must not
-- kill the run, and the health screen must show which one died (spec 3.7).

create table sync_runs (
  id               uuid primary key default gen_random_uuid(),
  channel_link_id  uuid references channel_links (id) on delete cascade,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           sync_status,
  events_seen      integer,
  blocks_created   integer,
  blocks_updated   integer,
  blocks_removed   integer,
  conflicts_found  integer,
  error            text
);

create index sync_runs_link_idx on sync_runs (channel_link_id, started_at desc);
