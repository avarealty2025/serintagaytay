/**
 * Replays the owner's booking sheet through the availability engine.
 *
 * REPORT ONLY - writes nothing. It exists to answer one question before any
 * data is migrated: do the historical bookings collide with each other? A
 * collision means either the sheet double-booked a unit, or the import
 * mis-mapped a unit token. Both must be resolved by hand.
 *
 * Run: node scripts/import-bookings.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findAllOverlaps } from "../src/lib/availability.ts";
import { nightsBetween } from "../src/lib/dates.ts";
import { resolveUnit, UNITS } from "../src/data/units.ts";
import type { BookingRange, BookingSource } from "../src/lib/types.ts";

const DATA = join(import.meta.dirname, "..", "data");
const MONTHS = ["month_may", "month_june", "month_july", "month_august"];

/** Excel serial (1900 system) to YYYY-MM-DD. Serial 46204 is 2026-07-01. */
function serialToDate(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + serial * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Minimal CSV row splitter honouring double-quoted fields. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/** The sheet writes the channel four different ways for "direct". */
function normaliseSource(raw: string): BookingSource | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("airbnb")) return "airbnb";
  if (s.includes("agoda")) return "agoda";
  if (s.includes("fb") || s.includes("facebook")) return "facebook";
  if (s.includes("direct")) return "direct";
  return null;
}

interface Parsed extends BookingRange {
  guest: string;
  source: BookingSource | null;
  rawUnit: string;
}

const parsed: Parsed[] = [];
const problems: string[] = [];
let rowsSeen = 0;

for (const m of MONTHS) {
  const text = readFileSync(join(DATA, `${m}.csv`), "utf8");
  const lines = text.split(/\r?\n/);
  let lastCheckIn: string | null = null;

  for (let i = 3; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const c = splitCsv(raw);

    const dateCell = (c[0] ?? "").trim();
    const unitCell = (c[1] ?? "").trim();
    const nightsCell = (c[3] ?? "").trim();
    const guest = (c[4] ?? "").trim();
    const sourceCell = (c[6] ?? "").trim();
    const outCell = (c[10] ?? "").trim();

    // A blank date means "same arrival date as the row above". The sheet
    // relies on visual grouping, which the parser has to reconstruct.
    if (dateCell && Number(dateCell)) lastCheckIn = serialToDate(Number(dateCell));
    if (!unitCell || /TOWER|ROOM/i.test(unitCell)) continue;

    rowsSeen++;
    const where = `${m}:${i + 1}`;

    if (!lastCheckIn) {
      problems.push(`${where} - no check-in date in scope`);
      continue;
    }

    const unit = resolveUnit(unitCell);
    if (!unit) {
      problems.push(`${where} - cannot resolve unit "${unitCell}"`);
      continue;
    }

    let checkOut: string | null = null;
    if (outCell && Number(outCell)) checkOut = serialToDate(Number(outCell));
    else if (Number(nightsCell) > 0) {
      const d = new Date(Date.parse(lastCheckIn + "T00:00:00Z"));
      d.setUTCDate(d.getUTCDate() + Number(nightsCell));
      checkOut = d.toISOString().slice(0, 10);
    }
    if (!checkOut) {
      problems.push(
        `${where} - ${unit.code}: no checkout and no night count ("${nightsCell}")`,
      );
      continue;
    }
    if (nightsBetween(lastCheckIn, checkOut) <= 0) {
      problems.push(
        `${where} - ${unit.code}: checkout ${checkOut} not after check-in ${lastCheckIn}`,
      );
      continue;
    }

    parsed.push({
      id: where,
      unitId: unit.id,
      checkIn: lastCheckIn,
      checkOut,
      status: "checked_out",
      guest,
      source: normaliseSource(sourceCell),
      rawUnit: unitCell,
    });
  }
}

// -- report -----------------------------------------------------------------

console.log("\n  SERIN - booking sheet replay (report only, nothing written)\n");
console.log(
  `  Units seeded            ${UNITS.length} (${UNITS.filter((u) => u.active).length} active)`,
);
console.log(`  Booking rows seen       ${rowsSeen}`);
console.log(`  Parsed successfully     ${parsed.length}`);
console.log(`  Could not parse         ${problems.length}`);

const byChannel = new Map<string, number>();
for (const p of parsed) {
  const k = p.source ?? "(unlabelled)";
  byChannel.set(k, (byChannel.get(k) ?? 0) + 1);
}
console.log("\n  By channel");
for (const [k, v] of [...byChannel].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(14)} ${String(v).padStart(3)}`);
}

const nights = parsed.reduce(
  (s, p) => s + nightsBetween(p.checkIn, p.checkOut),
  0,
);
console.log(`\n  Total nights booked     ${nights}`);

const overlaps = findAllOverlaps(parsed);
console.log(`\n  OVERLAPPING PAIRS       ${overlaps.length}`);
if (overlaps.length) {
  console.log(
    "\n  Each is either a real double-booking in the sheet or a mis-mapped",
  );
  console.log("  unit token. Both must be resolved by hand before migrating.\n");
  for (const [a, b] of overlaps) {
    const ga = (a as Parsed).guest || "(no name)";
    const gb = (b as Parsed).guest || "(no name)";
    console.log(`    ${a.unitId}`);
    console.log(`      ${a.checkIn} -> ${a.checkOut}  ${ga}  [${a.id}]`);
    console.log(`      ${b.checkIn} -> ${b.checkOut}  ${gb}  [${b.id}]`);
  }
}

if (problems.length) {
  console.log(`\n  UNPARSED ROWS (${problems.length})\n`);
  for (const p of problems) console.log(`    ${p}`);
}
console.log("");
