# Serin Tagaytay Staycation - PMS

Booking and operations system for 17 active condominium units at Serin West and
Serin East, Tagaytay.

## Status

| Step | State |
|---|---|
| 1. Foundation - schema, migrations, seed | Migrations written, awaiting Supabase |
| 2. Availability & pricing engine | Done. 58 tests passing. |
| 3. Admin portal | Done. Today, calendar, bookings, tasks, reports, settings |
| 4. iCal sync | Engine done. Parser, generator, export endpoint |
| 5. Public booking site | Done. Search + 3-step booking flow |
| 6. Payment flow | UI done. Needs Supabase for persistence |
| 7. Staff tasks | Done. Auto-generated from arrivals/departures |
| 8. Reports | Done. Revenue, occupancy, source/unit breakdowns |

## Requirements

- Node 20+
- PostgreSQL 14+ for migrations (EXCLUDE USING gist constraint)

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## The one rule

Availability must never lie. Prefer rejecting a booking over accepting a
double-booking.

The guarantee lives in the database, in `20260731000003_bookings.sql`:

```sql
exclude using gist (
  unit_id with =,
  daterange(check_in, check_out, '[)') with &&
) where (status not in ('cancelled','payment_rejected','expired') and deleted_at is null)
```
