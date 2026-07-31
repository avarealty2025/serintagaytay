/**
 * Date helpers for the availability and pricing engine.
 *
 * Every date in this module is a calendar date, not an instant. Bookings are
 * "night of 4 July", never "4 July 14:00 +08:00" — so all arithmetic runs in
 * UTC on date-only values and never touches the host timezone. Display
 * formatting in Asia/Manila happens at the UI edge, not here.
 *
 * Ranges are half-open, [checkIn, checkOut). checkOut is the first night NOT
 * occupied, which is what lets a departure and an arrival share a day.
 */

/** A calendar date as `YYYY-MM-DD`. */
export type DateStr = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(d: DateStr): Date {
  if (!DATE_RE.test(d)) {
    throw new Error(`Invalid date "${d}": expected YYYY-MM-DD`);
  }
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, day));
  // Rejects impossible dates that Date would silently roll over (2026-02-30).
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${d}": no such calendar day`);
  }
  return dt;
}

export function toDateStr(d: Date): DateStr {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: DateStr, n: number): DateStr {
  const dt = parseDate(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toDateStr(dt);
}

/** Nights between two dates. `[)` semantics, so 4th → 5th is one night. */
export function nightsBetween(checkIn: DateStr, checkOut: DateStr): number {
  const a = parseDate(checkIn).getTime();
  const b = parseDate(checkOut).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Every night occupied by a stay: the check-in date up to, but not including, checkout. */
export function nightsInStay(checkIn: DateStr, checkOut: DateStr): DateStr[] {
  const n = nightsBetween(checkIn, checkOut);
  if (n <= 0) return [];
  const out: DateStr[] = [];
  for (let i = 0; i < n; i++) out.push(addDays(checkIn, i));
  return out;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(d: DateStr): number {
  return parseDate(d).getUTCDay();
}

/**
 * Whether a night is charged at the weekend rate.
 *
 * A "weekend night" is the night you sleep there, dated by its start. Friday
 * and Saturday nights are weekend; Sunday night is not, because the guest
 * leaves on Monday morning.
 */
export function isWeekendNight(d: DateStr): boolean {
  const dow = dayOfWeek(d);
  return dow === 5 || dow === 6;
}

/** Half-open overlap: `[aIn, aOut)` intersects `[bIn, bOut)`. */
export function rangesOverlap(
  aIn: DateStr,
  aOut: DateStr,
  bIn: DateStr,
  bOut: DateStr,
): boolean {
  return aIn < bOut && bIn < aOut;
}

/** Whether a date falls inside a half-open range. */
export function dateInRange(d: DateStr, start: DateStr, end: DateStr): boolean {
  return d >= start && d < end;
}
