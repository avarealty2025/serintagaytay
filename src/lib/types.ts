import type { DateStr } from "./dates.ts";

export type BookingSource =
  | "direct"
  | "airbnb"
  | "agoda"
  | "booking.com"
  | "facebook"
  | "manual"
  | "block";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "payment_rejected"
  | "expired"
  | "no_show"
  | "blocked";

/**
 * Statuses that release their dates back onto the market.
 *
 * This list MUST stay identical to the WHERE clause of the
 * `bookings_no_overlap` exclusion constraint in
 * `supabase/migrations/20260731000003_bookings.sql`. If the two ever drift, the
 * application and the database disagree about what is bookable, and the
 * database silently wins.
 *
 * `no_show` is deliberately absent: per the owner's decision a no-show night
 * is written off, not resold.
 */
export const RELEASING_STATUSES: readonly BookingStatus[] = [
  "cancelled",
  "payment_rejected",
  "expired",
] as const;

export function blocksDates(status: BookingStatus): boolean {
  return !RELEASING_STATUSES.includes(status);
}

export interface Unit {
  id: string;
  buildingId: string;
  tower: number;
  code: string;
  name?: string;
  type: "studio" | "exec_studio" | "1br" | "2br";
  description?: string;
  inclusions?: string[];
  amenities?: string[];
  sqm?: number;

  /** Guests included in the base rate. Above this, the extra guest fee applies. */
  capacity: number;
  /** Hard ceiling. A booking above this is rejected outright. */
  maxGuests: number;

  baseRate: number;
  weekendRate: number;
  monthlyRate?: number;
  cleaningFee: number;
  extraGuestFee: number;
  minStay: number;
  active: boolean;
  view?: string;
  checkinInstructions?: string;
}

/** A flat rate for a unit over a half-open date range. One rule type only. */
export interface RateOverride {
  unitId: string;
  startDate: DateStr;
  /** Exclusive. */
  endDate: DateStr;
  rate: number;
  minStay?: number;
  label?: string;
}

export interface BookingRange {
  id: string;
  unitId: string;
  checkIn: DateStr;
  checkOut: DateStr;
  status: BookingStatus;
}

export interface NightLine {
  date: DateStr;
  rate: number;
  /** Which rule set this night's price, for the itemised breakdown. */
  basis: "base" | "weekend" | "override";
  overrideLabel?: string;
}

export interface PriceBreakdown {
  unitId: string;
  checkIn: DateStr;
  checkOut: DateStr;
  guests: number;
  nights: NightLine[];
  nightsTotal: number;
  cleaningFee: number;
  extraGuestFee: number;
  extraGuests: number;
  total: number;
  currency: "PHP";
  /**
   * Long stays are not priced automatically. The monthly rate, deposit and
   * utilities treatment are still open questions, and guessing at them costs
   * the owner real money. Callers must fall back to a manual quote.
   */
  requiresManualQuote: boolean;
}
