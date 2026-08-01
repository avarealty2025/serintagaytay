import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nightsBetween } from "../lib/dates.ts";
import { resolveUnit } from "./units.ts";
import type { BookingRange, BookingSource } from "../lib/types.ts";

/**
 * Loads the owner's booking sheet.
 *
 * This is the interim data source. It exists so the app is demoable before a
 * database is provisioned, and so the replay script and the running app agree
 * about what the sheet says. Once the migrations are applied and the bookings
 * are imported, this module is replaced by database reads and deleted.
 */

const MONTHS = ["month_may", "month_june", "month_july", "month_august"];

export interface SheetBooking extends BookingRange {
  guest: string;
  source: BookingSource | null;
  guests: number;
  balanceNote: string;
}

export interface SheetLoad {
  bookings: SheetBooking[];
  problems: string[];
  rowsSeen: number;
}

/** Excel serial (1900 system) to YYYY-MM-DD. Serial 46204 is 2026-07-01. */
function serialToDate(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

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
export function normaliseSource(raw: string): BookingSource | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("airbnb")) return "airbnb";
  if (s.includes("agoda")) return "agoda";
  if (s.includes("fb") || s.includes("facebook")) return "facebook";
  if (s.includes("direct")) return "direct";
  return null;
}

export function loadSheet(dataDir: string): SheetLoad {
  const bookings: SheetBooking[] = [];
  const problems: string[] = [];
  let rowsSeen = 0;

  for (const m of MONTHS) {
    let text: string;
    try {
      text = readFileSync(join(dataDir, `${m}.csv`), "utf8");
    } catch {
      continue;
    }
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
      const paxCell = (c[5] ?? "").trim();
      const sourceCell = (c[6] ?? "").trim();
      const balanceCell = (c[7] ?? "").trim();
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

      bookings.push({
        id: where,
        unitId: unit.id,
        checkIn: lastCheckIn,
        checkOut,
        status: "confirmed",
        guest,
        guests: Number(paxCell) || 0,
        source: normaliseSource(sourceCell),
        balanceNote: balanceCell,
      });
    }
  }

  return { bookings, problems, rowsSeen };
}
