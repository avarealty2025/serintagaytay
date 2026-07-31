-- Acceptance criterion 1:
--   "Two overlapping bookings for the same unit cannot be created - verified
--    by a test that attempts it directly against the database."
--
-- This replays a REAL collision found in the owner's own sheet: 1-121 West,
-- June 2026, where Elenore Pascual (Airbnb, 12-14 Jun) and Saniel Joson
-- (direct via caretaker, 13-14 Jun, PHP 2,500 marked paid) both hold the
-- night of the 13th.
--
-- Everything runs inside a transaction and is rolled back. Nothing persists.
--
-- Run:  psql "$DATABASE_URL" -f scripts/verify-constraint.sql
--
-- PASS looks like an ERROR containing "bookings_no_overlap" on INSERT 2.
-- If INSERT 2 succeeds, the constraint is missing and the system is unsafe.

begin;

\echo ''
\echo '=== 1. seed a building and a unit ==============================='

insert into buildings (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Serin West Test');

insert into units (
  id, building_id, tower, code, type, capacity, max_guests,
  base_rate, weekend_rate, cleaning_fee, extra_guest_fee, min_stay
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  1, '121', '1br', 2, 6, 3000, 3500, 0, 0, 1
);

\echo ''
\echo '=== 2. Elenore Pascual, 12-14 Jun (Airbnb) - must SUCCEED ======='

insert into bookings (
  unit_id, source, check_in, check_out, guests_count, status, gross_amount
) values (
  '22222222-2222-2222-2222-222222222222',
  'airbnb', '2026-06-12', '2026-06-14', 5, 'confirmed', 7000
);

\echo ''
\echo '=== 3. Saniel Joson, 13-14 Jun (direct) - must FAIL ============='
\echo '    Expect: ERROR ... conflicting key value violates exclusion'
\echo '            constraint "bookings_no_overlap"'
\echo ''

insert into bookings (
  unit_id, source, check_in, check_out, guests_count, status, gross_amount
) values (
  '22222222-2222-2222-2222-222222222222',
  'direct', '2026-06-13', '2026-06-14', 3, 'confirmed', 2500
);

\echo ''
\echo '!!! If you are reading this, INSERT 3 SUCCEEDED and the constraint'
\echo '!!! is NOT protecting you. Do not go live.'

rollback;
