-- Promo / discount codes
create table promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  discount_pct  numeric(5,2) not null,
  max_uses      integer,
  current_uses  integer not null default 0,
  valid_from    date,
  valid_until   date,
  active        boolean not null default true,
  description   text,
  created_at    timestamptz not null default now(),

  constraint promo_codes_code_unique unique (code),
  constraint promo_codes_discount_range check (discount_pct > 0 and discount_pct <= 100),
  constraint promo_codes_max_uses_positive check (max_uses is null or max_uses > 0),
  constraint promo_codes_dates_valid check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create index promo_codes_active_idx on promo_codes (active, code) where active;

-- Track promo code usage on bookings
alter table bookings
  add column promo_code_id uuid references promo_codes (id) on delete set null,
  add column discount_amount numeric(12,2) not null default 0;
