-- Track whether guest paid reservation fee only or full payment.

alter table bookings
  add column if not exists payment_type text not null default 'reservation',
  add column if not exists amount_paid  numeric(12,2) not null default 0;

alter table bookings
  add constraint bookings_payment_type_valid check (payment_type in ('reservation', 'full')),
  add constraint bookings_amount_paid_non_negative check (amount_paid >= 0);
