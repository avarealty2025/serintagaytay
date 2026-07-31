import { rangesOverlap } from "./dates.ts";
import type { DateStr } from "./dates.ts";
import { blocksDates } from "./types.ts";
import type { BookingRange } from "./types.ts";

/**
 * Availability.
 *
 * This mirrors the `bookings_no_overlap` exclusion constraint so the UI can
 * reject a clash before the database does. It is NOT the guarantee. The
 * guarantee is the constraint in `20260731000003_bookings.sql`. If this file and the
 * database ever disagree, the database is right and this is a bug.
 *
 * The rule the whole system rests on: prefer rejecting a booking over
 * accepting a double-booking.
 */

export interface Conflict {
  bookingId: string;
  checkIn: DateStr;
  checkOut: DateStr;
}

/** Bookings that would clash with the candidate range for the same unit. */
export function findConflicts(
  unitId: string,
  checkIn: DateStr,
  checkOut: DateStr,
  existing: readonly BookingRange[],
  opts: { ignoreBookingId?: string } = {},
): Conflict[] {
  return existing
    .filter(
      (b) =>
        b.unitId === unitId &&
        b.id !== opts.ignoreBookingId &&
        blocksDates(b.status) &&
        rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
    )
    .map((b) => ({ bookingId: b.id, checkIn: b.checkIn, checkOut: b.checkOut }));
}

export function isAvailable(
  unitId: string,
  checkIn: DateStr,
  checkOut: DateStr,
  existing: readonly BookingRange[],
  opts: { ignoreBookingId?: string } = {},
): boolean {
  return findConflicts(unitId, checkIn, checkOut, existing, opts).length === 0;
}

/**
 * Every pair of bookings that overlap, across a whole set.
 *
 * Used to replay imported history: none of the imported bookings may collide
 * with each other, or the import has mis-mapped a unit.
 */
export function findAllOverlaps(
  bookings: readonly BookingRange[],
): Array<[BookingRange, BookingRange]> {
  const blocking = bookings.filter((b) => blocksDates(b.status));

  const byUnit = new Map<string, BookingRange[]>();
  for (const b of blocking) {
    const list = byUnit.get(b.unitId);
    if (list) list.push(b);
    else byUnit.set(b.unitId, [b]);
  }

  const pairs: Array<[BookingRange, BookingRange]> = [];
  for (const list of byUnit.values()) {
    const sorted = [...list].sort((x, y) => x.checkIn.localeCompare(y.checkIn));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        // Sorted by check-in: once b starts on or after a ends, so does
        // everything after it.
        if (b.checkIn >= a.checkOut) break;
        if (rangesOverlap(a.checkIn, a.checkOut, b.checkIn, b.checkOut)) {
          pairs.push([a, b]);
        }
      }
    }
  }
  return pairs;
}
