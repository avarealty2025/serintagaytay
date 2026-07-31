import { isWeekendNight, nightsBetween, nightsInStay, dateInRange } from "./dates.ts";
import type { DateStr } from "./dates.ts";
import type { NightLine, PriceBreakdown, RateOverride, Unit } from "./types.ts";

/**
 * THE pricing function.
 *
 * The public site, the admin, and every quote call this and nothing else. If a
 * second implementation ever appears, the two will disagree about money and
 * acceptance criterion 3 fails.
 *
 * Pure: no clock, no database, no locale. The same inputs always give the same
 * breakdown, which is what makes it testable and what makes the price a guest
 * sees identical to the price the owner sees.
 *
 * Source is deliberately ASCII-only. The peso sign is written as an escape so
 * a careless bulk edit on Windows cannot corrupt it.
 */

/** U+20B1 PESO SIGN. */
const PESO = "₱";

/** A stay of this many nights or more is treated as long-term. */
export const LONG_STAY_NIGHTS = 28;

export class PricingError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_RANGE"
      | "BELOW_MIN_STAY"
      | "OVER_MAX_GUESTS"
      | "UNIT_INACTIVE",
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/** Rounds to centavos. Money is never left as a float artefact. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The override covering a given night, if any.
 *
 * The database forbids two overrides covering the same night for the same unit
 * (`rate_overrides_no_overlap`), so at most one can match and precedence needs
 * no tie-breaking rule. We still take the first match defensively.
 */
function overrideFor(
  night: DateStr,
  unitId: string,
  overrides: readonly RateOverride[],
): RateOverride | undefined {
  return overrides.find(
    (o) => o.unitId === unitId && dateInRange(night, o.startDate, o.endDate),
  );
}

/** The strictest minimum stay in force: the unit's, or any override touching the stay. */
export function effectiveMinStay(
  unit: Unit,
  checkIn: DateStr,
  checkOut: DateStr,
  overrides: readonly RateOverride[] = [],
): number {
  let min = unit.minStay;
  for (const night of nightsInStay(checkIn, checkOut)) {
    const o = overrideFor(night, unit.id, overrides);
    if (o?.minStay != null && o.minStay > min) min = o.minStay;
  }
  return min;
}

export function quote(
  unit: Unit,
  checkIn: DateStr,
  checkOut: DateStr,
  guests: number,
  overrides: readonly RateOverride[] = [],
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);

  if (nights <= 0) {
    throw new PricingError(
      `Check-out (${checkOut}) must be after check-in (${checkIn})`,
      "INVALID_RANGE",
    );
  }
  if (!unit.active) {
    throw new PricingError(`Unit ${unit.code} is not active`, "UNIT_INACTIVE");
  }
  if (guests < 1) {
    throw new PricingError("At least one guest is required", "OVER_MAX_GUESTS");
  }
  if (guests > unit.maxGuests) {
    throw new PricingError(
      `${unit.code} sleeps ${unit.maxGuests}; ${guests} requested`,
      "OVER_MAX_GUESTS",
    );
  }

  const minStay = effectiveMinStay(unit, checkIn, checkOut, overrides);
  if (nights < minStay) {
    throw new PricingError(
      `${unit.code} has a ${minStay}-night minimum; ${nights} requested`,
      "BELOW_MIN_STAY",
    );
  }

  // Long stays fall out to a manual quote. See PriceBreakdown.requiresManualQuote.
  if (nights >= LONG_STAY_NIGHTS) {
    return {
      unitId: unit.id,
      checkIn,
      checkOut,
      guests,
      nights: [],
      nightsTotal: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      extraGuests: 0,
      total: 0,
      currency: "PHP",
      requiresManualQuote: true,
    };
  }

  const lines: NightLine[] = nightsInStay(checkIn, checkOut).map((date) => {
    const o = overrideFor(date, unit.id, overrides);
    if (o) {
      return o.label
        ? { date, rate: o.rate, basis: "override" as const, overrideLabel: o.label }
        : { date, rate: o.rate, basis: "override" as const };
    }
    return isWeekendNight(date)
      ? { date, rate: unit.weekendRate, basis: "weekend" as const }
      : { date, rate: unit.baseRate, basis: "base" as const };
  });

  const nightsTotal = money(lines.reduce((sum, l) => sum + l.rate, 0));

  // Guests above the included capacity are charged per extra guest per night.
  const extraGuests = Math.max(0, guests - unit.capacity);
  const extraGuestFee = money(extraGuests * unit.extraGuestFee * nights);

  const cleaningFee = money(unit.cleaningFee);
  const total = money(nightsTotal + cleaningFee + extraGuestFee);

  return {
    unitId: unit.id,
    checkIn,
    checkOut,
    guests,
    nights: lines,
    nightsTotal,
    cleaningFee,
    extraGuestFee,
    extraGuests,
    total,
    currency: "PHP",
    requiresManualQuote: false,
  };
}

/** The only place PHP currency formatting is defined. */
export function formatPHP(amount: number): string {
  return (
    PESO +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
