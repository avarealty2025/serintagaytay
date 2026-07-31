# Setup

Everything on this page is yours to run, because it involves credentials.
Once it's done I can take over.

---

## 1. Rotate the tokens you pasted into chat

Both are in the conversation transcript now.

- Supabase PAT: https://supabase.com/dashboard/account/tokens
- Vercel token: https://vercel.com/account/tokens

The `sbp_` token especially - a Supabase personal access token can create and
delete projects on your whole account.

Generate the new ones when you need them below. They never have to leave your
machine.

---

## 2. Create the Supabase project

https://supabase.com - the free tier is fine at 17 units.

- **Region: Singapore.** Closest to Manila; every millisecond is round-trip
  latency for guests on mobile data.
- **Postgres 15.** Not optional - the whole double-booking guarantee is an
  `EXCLUDE USING gist` constraint that only Postgres provides.
- Save the database password somewhere safe. Supabase shows it once.

---

## 3. Fill in `.env.local`

```bash
cp .env.example .env.local
```

Then paste your values into `.env.local`. It is gitignored, so nothing leaks.

From **Project Settings > API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

From **Project Settings > Database**:
- `DATABASE_URL`

---

## 4. Log in and link

```bash
npx supabase login
```

That opens a browser. Then link this folder to the project - the ref is in your
Supabase dashboard URL:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

---

## 5. Push the schema

```bash
npm run db:push
```

Six migrations run in order. The important one is
`20260731000003_bookings.sql`, which creates the constraint that makes
double-booking impossible.

---

## 6. Prove the guarantee

This is acceptance criterion 1, and it replays a real collision from your own
sheet - Elenore Pascual and Saniel Joson, both holding 1-121 West on the night
of 13 June 2026.

```bash
npm run db:verify
```

**A PASS looks like an error.** You want to see:

```
ERROR:  conflicting key value violates exclusion constraint "bookings_no_overlap"
```

That is Postgres refusing to let the second booking exist. Everything runs in a
transaction and rolls back, so nothing is saved.

If the second insert *succeeds*, the constraint did not apply and the system is
not protecting you. Stop and tell me.

---

## Then tell me, and I'll do the rest

- Seed the 18 units, the rate card, and the Airbnb iCal URLs
- Import the 104 parsed bookings
- Carry on with step 3, the admin calendar

---

## Still needed from you (money and data, which I won't guess)

1. **Cleaning fee** and **extra guest fee** - seeded at 0, so every booking
   currently undercharges.
2. **The three double-bookings** - which guest actually stayed?
   - 1-605 West: Pia Abegail (4-31 Jul) vs Maelena Pamanilaga (30-31 Jul)
   - 1-121 West: Elenore Pascual (12-14 Jun) vs Saniel Joson (13-14 Jun)
   - 1-517 West: Joan Joson vs Cherrelyn Aguilar (both 13-14 Jun)
3. **414 East's long-term tenancy** through October - dates and monthly rate.
4. **Three May rows** (919, 420, 1407) with no checkout date or night count.
5. **The reservation fee amount**, and whether it is refundable.
