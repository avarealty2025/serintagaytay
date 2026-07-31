-- 0006_finance_settings_audit.sql
-- Expenses, commission rates, global settings, audit log.

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
-- A simple log, not an accounting system (spec 3.8). A list and a monthly
-- total by category. That is all.

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid references units (id),
  building_id  uuid references buildings (id),
  category     text not null,
  amount       numeric(12,2) not null,
  date         date not null,
  vendor       text,
  notes        text,
  receipt_url  text,                          -- PRIVATE bucket, signed URL
  created_by   uuid not null references users (id),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,                   -- financial: soft delete only

  constraint expenses_amount_positive check (amount > 0),
  -- An expense belongs to a unit or a building, not both and not neither.
  constraint expenses_scope check (
    (unit_id is not null and building_id is null)
    or (unit_id is null and building_id is not null)
  )
);

create index expenses_date_idx on expenses (date) where deleted_at is null;
create index expenses_category_idx on expenses (category, date) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- commission_rates
-- ---------------------------------------------------------------------------
-- Effective-dated so historical bookings keep the rate that applied when they
-- were taken. Revenue reporting must never restate last year's net because
-- someone edited a rate today.
--
-- Note: this covers OTA channels only. Direct and Facebook bookings pay no
-- commission and simply have no row.

create table commission_rates (
  id              uuid primary key default gen_random_uuid(),
  channel         booking_source not null,
  rate_percent    numeric(5,2) not null,
  effective_from  date not null,
  created_at      timestamptz not null default now(),

  constraint commission_rate_range check (rate_percent >= 0 and rate_percent <= 100)
);

create unique index commission_rates_channel_from_unique
  on commission_rates (channel, effective_from);

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
-- Single-row-per-key store for the handful of globals the spec makes
-- configurable: default reservation fee, hold duration, reminder offset,
-- check-in/checkout times, payment instructions (GCash name/number, bank
-- details).

create table settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
-- Required on every booking, rate, payment and task change (spec 8).
-- user_id is nullable because background jobs (hold expiry, iCal sync) act
-- with no user; those rows record the job name in `actor`.

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users (id),
  actor      text,                            -- 'job:hold-expiry' when user_id is null
  entity     text not null,                   -- 'bookings', 'payments', ...
  entity_id  uuid not null,
  action     text not null,                   -- 'insert' | 'update' | 'delete'
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id, at desc);
create index audit_log_at_idx on audit_log (at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger units_updated_at
  before update on units
  for each row execute function set_updated_at();

create trigger bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create trigger task_templates_updated_at
  before update on task_templates
  for each row execute function set_updated_at();

create trigger channel_links_updated_at
  before update on channel_links
  for each row execute function set_updated_at();
