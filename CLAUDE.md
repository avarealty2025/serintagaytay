# Serin Tagaytay PMS

Property management system for Serin Tagaytay Staycation (tagaytaystaycation.com).

## Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL) — snake_case DB columns mapped to camelCase in app
- **Hosting**: Vercel (push to `main` auto-deploys)
- **Email**: Resend + Nodemailer
- **AI**: Anthropic Claude SDK (in-app AI assistant)
- **Testing**: Vitest (`npm test`)
- **PWA**: Service worker at `public/sw.js`, manifest at `public/manifest.json`

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (also runs typecheck)
npm run typecheck    # tsc --noEmit
npm test             # Vitest run
```

## Project Structure

```
app/
  admin/              # Admin dashboard (requires login)
    layout.tsx        # Wraps children in MeProvider > UnitsProvider
    _perm-guard.tsx   # MeProvider + PermGuard — role-based access
    _units-context.tsx # UnitsProvider + useUnits() — shared unit data
    bookings/         # Booking management (list, new, edit, history)
    calendar/         # Calendar view
    cleaning/         # Cleaning schedule
    units/            # Unit management
    ...               # expenses, guests, invoices, maintenance, reports, etc.
  api/                # API routes
    bookings/         # CRUD + confirm + lookup
    units/            # GET all, POST create, [id] detail + photos
    ...               # auth, invoices, reports, ical, cron, etc.
  book/page.tsx       # Public booking page
  compare/page.tsx    # Public unit comparison
  my-booking/page.tsx # Guest booking lookup
  receipt/page.tsx    # Booking receipt
  page.tsx            # Landing page (server component)
src/
  data/
    db.ts             # Supabase queries: getBookings(), getUnits(), getExpenses(), etc.
    units.ts          # TAAL_VIEW_CODES constant (hardcoded unit array kept as fallback only)
    units-server.ts   # getUnitsFromDb() — merges DB units with hardcoded fallback
  lib/
    pricing.ts        # THE pricing function — quote(). Single source of truth for all prices.
    types.ts          # Unit, PriceBreakdown, BookingStatus, etc.
    dates.ts          # Date utilities (nightsBetween, toDateStr, etc.)
    supabase.ts       # Supabase client (getSupabase, getSupabaseAdmin)
    permissions.ts    # Role/permission definitions
    settings.ts       # Business settings (getSettings)
    email.ts          # Email sending utilities
```

## Key Patterns

### Units — Database-Driven

All unit data comes from the Supabase `units` table. **Never use the hardcoded `UNITS` array** from `src/data/units.ts` for unit data — it exists only as a fallback reference in `getUnitsFromDb()`.

- **Client components** (inside admin layout): use `useUnits()` from `app/admin/_units-context.tsx`
- **Server components**: use `getUnitsFromDb()` from `src/data/units-server.ts`
- **API routes**: use `getUnits()` from `src/data/db.ts`
- **Public pages** (outside admin layout): fetch from `/api/units` with useEffect

The `TAAL_VIEW_CODES` constant from `src/data/units.ts` is still used — it's a static set of unit codes with Taal views, not unit data.

### Pricing

`quote()` in `src/lib/pricing.ts` is the single source of truth. The public site, admin, and every quote call use this function and nothing else. It's pure — no clock, no database, no locale. The `Unit` type it accepts has `type: "studio" | "exec_studio" | "1br" | "2br"` — cast `UnitItem` with `as Unit` when calling from client components.

### Auth & Permissions

- Cookie-based auth: `serin_admin` cookie holds the user ID
- `MeProvider` / `useMe()` — provides current user + role
- `PermGuard` — wraps pages requiring specific permissions
- Roles: super_admin, owner, manager, reception, cleaner, maintenance, accounting
- Permissions checked both client-side (PermGuard) and server-side (API routes)

### DB Column Mapping

Supabase uses snake_case (`building_id`, `base_rate`, `max_guests`). App code uses camelCase (`buildingId`, `baseRate`, `maxGuests`). The `dbUnitToAppUnit()` function in `db.ts` handles the mapping.

### Unit ID Format

Unit IDs follow the pattern: `{building}-{tower}-{code}` (e.g., `east-2-106`, `west-1-121`). Building is derived from the buildings table name ("Serin West" → "west").

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
