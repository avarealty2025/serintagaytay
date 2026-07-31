# DECISIONS

Running record of decisions made while building the Serin Tagaytay Staycation
MVP. Newest section last. Every entry records the decision, who made it, and
why — so a future reader can tell a deliberate choice from an accident.

---

## D1 — There was no existing repo (2026-07-31)

**Decision:** Build from scratch.

Section 0 of the spec describes an existing repo with a static visual preview,
README, `docs/deploy.md`, an imported rate card, and ~96 historical bookings.
No such repo exists on the owner's machine or anywhere reachable — no `.git`
directory, no `package.json`, and Claude Code's own project history shows this
as the first session on the machine.

**Consequence:** there is no visual design to inherit. The public site's look
is designed fresh. Nothing was discarded, because nothing existed.

---

## D2 — The Google Sheet is the source of truth for seed data (2026-07-31)

**Decision:** Seed from the owner's Google Sheet, not from the (non-existent)
repo import.

Sheet: `12mTR7vRHGUMHXs3pogtFEYzzJ5ph-0E3RS_w9zU6PEs`, six tabs — `Month May`
(hidden), `Month of June` (hidden), `Month of July`, `Month of August`,
`Title unit`, `Calendar link`.

It contains more than Section 0 promised:

- **`Calendar link`** — full unit inventory: type, sqm, parking slot, sleeping
  arrangement, bed/bath counts, light-cooking flag, photo folder, and a live
  **Airbnb iCal export URL for every unit**.
- **Rate card**, priced by unit *type* rather than per unit.
- **`Month *` tabs** — 107 booking rows across May–August 2026.

---

## D3 — The bookings are current, not historical (2026-07-31)

The spec calls these "~96 historical bookings". They are actually **107 rows
covering May–August 2026** — i.e. live and forward-looking, not history.

| Month | Rows | Mix |
|---|---|---|
| May 2026 | 14 | Airbnb 7, FB 3, unlabelled 4 |
| June 2026 | 39 | Airbnb 14, FB 9, Agoda 6, Direct 10 |
| July 2026 | 45 | Airbnb 20, Direct 13, FB 6, Agoda 5 |
| Aug 2026 | 9 | Agoda 3, FB 3, Direct 3 |

**Consequence for reporting:** only June and July are complete months. May is a
partial hidden tab and August is still filling (today is 31 July 2026).
Occupancy figures for May and August will understate reality and the UI must
say so rather than silently averaging them.

**Also:** zero Booking.com bookings appear anywhere in the data, which
strengthens the spec's decision to exclude Booking.com from v1.

---

## D4 — Unit roster: 18 seeded, 17 active (2026-07-31)

The spec says 17 units; the sheet lists 18 with working Airbnb iCal links
(11 Serin West, 7 Serin East). Owner resolved the discrepancy:

| Unit | Status | Note |
|---|---|---|
| East 414 | **Active** | Long-stay tenant until October 2026 |
| East 220 | **Active** | Co-handled by the unit owner — see D7 |
| East 809 | **Inactive** | Seeded with `active = false`; not let |

Seeding 18 rows with 809 inactive yields **17 active units**, reconciling the
sheet to the spec.

---

## D5 — Unit identity is (building, tower, code) (2026-07-31)

**Decision:** Add a `tower` column to `units`, deviating from the Section 4
data model, and make uniqueness `(building_id, tower, code)`.

The source data addresses units as `<tower>-<code>` (e.g. `2-919`), but **the
tower digit does not encode the building**: `2-420` is West while `2-407` is
East. Separately, **unit code 517 exists in both buildings**, which is why
those rows alone are hand-written `1-517 EAST` and `1-517 WEST`.

Without `tower` stored explicitly the import cannot round-trip its own
identifiers, and `(building, code)` alone would risk a silent collision if a
tower ever repeated a unit number. A silent collision here attributes bookings
to the wrong unit, which is exactly the failure the availability engine exists
to prevent.

---

## D6 — `source` is normalised; the person moves to `taken_by` (2026-07-31)

The sheet's channel column carries four spellings of the same thing —
`Direct/April`, `Direct/ Caretaker`, `Direct /Ate Jona`, `Direct/caretaker`.
These encode *who took the booking*, not the channel.

**Decision:** normalise all four to `source = 'direct'` and put the person's
name in a `taken_by` text column. Otherwise channel reporting in 3.8 fragments
into six columns that all mean "direct".

---

## D7 — Unit 220 is treated as a normal bookable unit (2026-07-31)

**Decision by the owner.** Raised as a risk and reaffirmed.

220 is co-handled by its unit owner, who may take bookings outside this system.
Those bookings are invisible to us, so the calendar can be wrong for this unit
in a way it cannot be for the other 17 — which sits against the Section 8 rule
that availability must never lie.

Options offered were: enter the owner's bookings as blocks, exclude 220 from
the public site, or import an iCal feed from wherever they list it. The owner
chose to treat it like any other unit and accept the risk.

**Recorded so it is traceable.** If a double-booking ever occurs on 220, this
is the reason, and the mitigation is one of the three options above.

---

## D8 — A no-show keeps the night blocked (2026-07-31)

**Decision by the owner.** Resolves open question 4, and it is a schema
decision rather than a UI one.

`no_show` is **not** in the exclusion constraint's release list, so a no-show
booking keeps holding its dates and the night is written off rather than
resold.

If this policy changes, adding `'no_show'` to the `status not in (...)` list in
`20260731000003_bookings.sql` is the entire behaviour change.

---

## D9 — Migrations are plain SQL run by the Supabase CLI; Drizzle is the query layer (2026-07-31)

**Decision:** hand-written numbered SQL in `supabase/migrations/`, with Drizzle
used only as the typed query builder.

The spec allows Drizzle or Prisma and requires the exclusion constraint as a
raw SQL migration. Rather than have an ORM generate migrations and then
hand-patch the one it cannot express, all migrations are plain SQL. This avoids
drizzle-kit or Prisma repeatedly detecting the exclusion constraint as drift
and trying to drop it — a failure mode that would quietly remove the single
most important guarantee in the system.

Drizzle over Prisma because it is a thin typed wrapper that does not need to
own the migration story, and has lower cold-start cost on Vercel serverless.

---

## D10 — Money and time conventions (2026-07-31)

- All amounts are `numeric(12,2)`. Never float — PHP values are summed and
  compared for revenue reporting and must not drift.
- All timestamps are `timestamptz`, stored UTC, displayed Asia/Manila.
- Date ranges use `[)` semantics throughout: `check_out` is the first night
  *not* occupied, so a departure and an arrival on the same day do not collide.
- Refunds are stored as negative `payments.amount`; a check constraint enforces
  the sign against `payment_type`.

---

## D11 — Brand palette comes from the existing logo (2026-07-31)

The owner supplied the Serin logo. It supersedes every colour choice made
before it.

- **Serin Green `#2F5A1E`** — the pine, the Taal cone, the "TAGAYTAY" wordmark.
  Used as the accent and for every ridge layer.
- **Serin Gold `#C89F45`** — "SERIN" and the ridge sweep. Display only.

**Gold is never used for body text.** At `#C89F45` it does not reach a readable
contrast ratio on white at small sizes. It is a wordmark and rule colour, which
is exactly how the logo already uses it.

Gold is also deliberately **not** a channel colour on the calendar — it belongs
to the mark, and at bar size it would be mistaken for Agoda.

The logo has been rebuilt as inline SVG so it scales, recolours for dark mode
and costs nothing to load. It is a reconstruction from a raster image; if the
original vector file surfaces, swap it in.

---

## D12 — Scope held against "make it like Hostaway" (2026-07-31)

Asked to build the system "like hostaway.com". Interpreted as **visual and
structural polish, not feature parity**, and the owner did not object when
offered the alternatives.

Delivered: sidebar app shell, filter bars, dense sortable data tables, status
badges, alert counts in the nav.

**Not** delivered, because each sits in spec Section 9: unified inbox, automated
messaging, dynamic pricing, owner statements, full accounting, card gateway.

Worth recording once: Hostaway's channel manager runs on official API
partnerships with Airbnb and Booking.com that individual hosts cannot obtain.
No amount of building reproduces it. iCal remains the ceiling — dates only,
roughly two hours of lag. This is already stated in spec 3.7.

---

## D13 — Node installed per-user, without administrator rights (2026-07-31)

The winget install stalled indefinitely on a UAC elevation prompt. Resolved by
extracting the official Node zip to `C:\Users\melan\tools\node-v24.18.1-win-x64`
and prepending it to the user PATH. No admin rights needed, and nothing was
written to Program Files.

---

## D14 — Source files are ASCII-only (2026-07-31)

A bulk `.js` to `.ts` import rewrite through PowerShell read UTF-8 as Latin-1
and wrote it back as UTF-8, double-encoding every non-ASCII character. The
repair pass then broke string literals, because a mangled em-dash decodes to a
sequence containing a double quote.

**Rule going forward:** source files contain ASCII only. The peso sign is
written as the escape `\u20B1`, never as a literal. Comments use plain hyphens,
not em-dashes. This removes an entire class of Windows tooling failure.

---

## D15 — The historical replay found three real double-bookings (2026-07-31)

`scripts/import-bookings.ts` replays the sheet through the availability engine
and writes nothing. Results:

| | |
|---|---|
| Rows seen | 107 |
| Parsed | 104 |
| Unparsed | 3 |
| Nights booked | 187 |
| **Overlapping pairs** | **3** |

Channel mix: Airbnb 41, Direct 26, Facebook 21, Agoda 14, unlabelled 2.

**The three collisions are real and must be resolved before migrating.** They
are not parser artefacts — two of the three are unambiguous in the source:

1. **1-605 West** — Pia Abegail Hayahay's Airbnb long stay, 4–31 Jul
   ("1 Months Stay 4-31"), overlaps Maelena Pamanilaga, 30–31 Jul, Direct via
   caretaker, marked PAID. A paid guest was sold a night already let monthly.
2. **1-121 West** — Elenore Pascual, Airbnb, 12–14 Jun, overlaps Saniel Joson,
   Direct via caretaker, 13–14 Jun, PHP 2,500 marked paid. Both hold the night
   of the 13th.
3. **1-517 West** — Joan Joson (Direct/April) and Cherrelyn Aguilar
   (Direct/Caretaker, PHP 3,200 paid), both 13–14 Jun. Both rows say
   "1-517 WEST" explicitly, so this is not the East/West ambiguity from D5.
   Either a genuine double-booking, or one row should read EAST.

**This is the business case for the project, found in its own data.** Three
double-bookings in roughly two months of records, all involving a direct
booking taken by phone or Facebook against an existing stay. The
`bookings_no_overlap` constraint makes each of these impossible to enter.

The 3 unparsed rows are May entries for 919, 420 and 1407 with neither a
checkout date nor a night count. They need the owner to supply the dates.

---

## Open — not yet decided

Carried from spec Section 10. Blocking items are marked.

1. **Reservation fee amount** — flat, or by unit tier? *Blocks step 6.*
2. **Is the reservation fee refundable?** Must be shown before payment.
   *Blocks step 6.*
3. **Current long-term tenancies.** `414 until october` exists only as free
   text in a note cell, not as a booking row. At least one live tenancy is
   therefore missing from the 107 rows. *Blocks correct seeding in step 1* —
   without it the calendar shows 414 bookable through October.
4. Can the balance be paid by GCash on arrival, or cash only?
5. Are all units owned, or some leased / revenue-shared? (D7 hints at the
   latter for 220. Owner payouts remain out of scope per Section 9.)
6. How many units are on **Agoda**? Agoda bookings appear in the data but the
   sheet holds no Agoda iCal URLs. *Blocks step 4 for Agoda.*
7. Commission rate actually paid per channel. *Blocks net revenue in step 8.*
8. Long-term stays: flat monthly rate, security deposit, utilities separate?
9. How many staff per role, and does each get their own login?
10. Check-in / checkout times; are early check-in and late checkout charged?
11. Domain name for the public site.
12. English only, or English and Filipino?
