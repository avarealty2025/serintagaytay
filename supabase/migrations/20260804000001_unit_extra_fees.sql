-- Add parking fee, early/late check-in fees, and discount columns to units.

alter table units
  add column if not exists parking_fee        numeric(12,2) not null default 0,
  add column if not exists early_checkin_fee   numeric(12,2) not null default 0,
  add column if not exists late_checkout_fee   numeric(12,2) not null default 0,
  add column if not exists weekly_discount_pct numeric(5,2)  not null default 0,
  add column if not exists monthly_discount_pct numeric(5,2) not null default 0;

alter table units
  add constraint units_extra_fees_non_negative check (
    parking_fee >= 0
    and early_checkin_fee >= 0
    and late_checkout_fee >= 0
    and weekly_discount_pct >= 0 and weekly_discount_pct <= 100
    and monthly_discount_pct >= 0 and monthly_discount_pct <= 100
  );
