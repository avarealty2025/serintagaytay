import { describe, expect, it } from "vitest";
import { LONG_STAY_NIGHTS, PricingError, formatPHP, quote } from "./pricing.ts";
import type { RateOverride, Unit } from "./types.ts";

/** U+20B1 PESO SIGN, escaped so bulk edits cannot corrupt it. */
const PESO = "₱";

/**
 * Fixtures use the real rate card from the owner's sheet.
 *
 * Two figures are NOT from the sheet and are test values only: cleaningFee and
 * extraGuestFee. The sheet records neither, and both remain open questions.
 * They are exercised here as mechanics, not asserted as policy.
 *
 * capacity = 2 for every type. That reads the rate card's own notation,
 * "Studio (23sqm) (2-4 pax)" and "1 Bedroom Unit (2-6 pax)", as: the rate
 * covers two guests, and the second number is the ceiling.
 */
const studio: Unit = {
  id: "u-210",
  buildingId: "west",
  tower: 1,
  code: "210",
  name: "SINAG",
  type: "studio",
  capacity: 2,
  maxGuests: 4,
  baseRate: 1800,
  weekendRate: 2200,
  cleaningFee: 500,
  extraGuestFee: 300,
  minStay: 1,
  active: true,
};

const twoBr: Unit = {
  id: "u-919",
  buildingId: "west",
  tower: 2,
  code: "919",
  name: "TANAW",
  type: "2br",
  capacity: 2,
  maxGuests: 8,
  baseRate: 5000,
  weekendRate: 5500,
  cleaningFee: 500,
  extraGuestFee: 0,
  minStay: 1,
  active: true,
};

// July 2026: the 1st is a Wednesday, so the 3rd is Friday and the 4th Saturday.
describe("weekend rate application", () => {
  it("charges the weekend rate for Friday and Saturday nights", () => {
    const q = quote(studio, "2026-07-03", "2026-07-05", 2);
    expect(q.nights.map((n) => n.basis)).toEqual(["weekend", "weekend"]);
    expect(q.nightsTotal).toBe(4400);
  });

  it("charges the base rate for a Sunday night", () => {
    const q = quote(studio, "2026-07-05", "2026-07-06", 2);
    expect(q.nights).toHaveLength(1);
    expect(q.nights[0]!.basis).toBe("base");
    expect(q.nightsTotal).toBe(1800);
  });

  it("mixes rates correctly across a Thursday-to-Sunday stay", () => {
    // Thu 2 (base), Fri 3 (weekend), Sat 4 (weekend).
    const q = quote(studio, "2026-07-02", "2026-07-05", 2);
    expect(q.nights.map((n) => n.basis)).toEqual(["base", "weekend", "weekend"]);
    expect(q.nightsTotal).toBe(1800 + 2200 + 2200);
  });
});

describe("date-range override precedence", () => {
  const peak: RateOverride[] = [
    {
      unitId: "u-210",
      startDate: "2026-07-03",
      endDate: "2026-07-05",
      rate: 3500,
      label: "Peak weekend",
    },
  ];

  it("beats both the base and the weekend rate", () => {
    const q = quote(studio, "2026-07-03", "2026-07-05", 2, peak);
    expect(q.nights.map((n) => n.basis)).toEqual(["override", "override"]);
    expect(q.nightsTotal).toBe(7000);
    expect(q.nights[0]!.overrideLabel).toBe("Peak weekend");
  });

  it("applies only to nights inside the range, half-open semantics", () => {
    // The override covers the 3rd and 4th. The 5th falls outside and is a Sunday.
    const q = quote(studio, "2026-07-03", "2026-07-06", 2, peak);
    expect(q.nights.map((n) => n.basis)).toEqual([
      "override",
      "override",
      "base",
    ]);
    expect(q.nightsTotal).toBe(3500 + 3500 + 1800);
  });

  it("ignores overrides belonging to a different unit", () => {
    const q = quote(twoBr, "2026-07-03", "2026-07-05", 2, peak);
    expect(q.nights.every((n) => n.basis === "weekend")).toBe(true);
    expect(q.nightsTotal).toBe(11000);
  });
});

describe("minimum stay enforcement", () => {
  it("rejects a stay shorter than the unit minimum", () => {
    const twoNightMin: Unit = { ...studio, minStay: 2 };
    expect(() => quote(twoNightMin, "2026-07-03", "2026-07-04", 2)).toThrow(
      PricingError,
    );
  });

  it("accepts a stay exactly at the minimum", () => {
    const twoNightMin: Unit = { ...studio, minStay: 2 };
    expect(
      quote(twoNightMin, "2026-07-03", "2026-07-05", 2).nights,
    ).toHaveLength(2);
  });

  it("takes the stricter minimum when an override raises it", () => {
    const overrides: RateOverride[] = [
      {
        unitId: "u-210",
        startDate: "2026-12-24",
        endDate: "2026-12-27",
        rate: 4000,
        minStay: 3,
        label: "Christmas",
      },
    ];
    expect(() => quote(studio, "2026-12-24", "2026-12-26", 2, overrides)).toThrow(
      /3-night minimum/,
    );
    expect(
      quote(studio, "2026-12-24", "2026-12-27", 2, overrides).nights,
    ).toHaveLength(3);
  });
});

describe("extra guest fees", () => {
  it("charges nothing at or below the included capacity", () => {
    expect(quote(studio, "2026-07-06", "2026-07-07", 2).extraGuestFee).toBe(0);
    expect(quote(studio, "2026-07-06", "2026-07-07", 1).extraGuestFee).toBe(0);
  });

  it("charges per extra guest per night", () => {
    // 2 guests over capacity, times 300, times 2 nights.
    const q = quote(studio, "2026-07-06", "2026-07-08", 4);
    expect(q.extraGuests).toBe(2);
    expect(q.extraGuestFee).toBe(1200);
  });

  it("rejects a booking above the unit ceiling", () => {
    expect(() => quote(studio, "2026-07-06", "2026-07-07", 5)).toThrow(/sleeps 4/);
  });
});

describe("month-boundary stays", () => {
  it("prices nights either side of a month end", () => {
    // Fri 31 Jul and Sat 1 Aug are both weekend nights.
    const q = quote(twoBr, "2026-07-31", "2026-08-02", 4);
    expect(q.nights.map((n) => n.date)).toEqual(["2026-07-31", "2026-08-01"]);
    expect(q.nights.map((n) => n.basis)).toEqual(["weekend", "weekend"]);
    expect(q.nightsTotal).toBe(11000);
  });

  it("prices across a year boundary", () => {
    // Thu 31 Dec 2026 (base) and Fri 1 Jan 2027 (weekend).
    const q = quote(studio, "2026-12-31", "2027-01-02", 2);
    expect(q.nights.map((n) => n.basis)).toEqual(["base", "weekend"]);
    expect(q.nightsTotal).toBe(1800 + 2200);
  });

  it("handles a leap day", () => {
    const q = quote(studio, "2028-02-28", "2028-03-01", 2);
    expect(q.nights.map((n) => n.date)).toEqual(["2028-02-28", "2028-02-29"]);
  });
});

describe("totals", () => {
  it("adds nights, cleaning and extra guests into one total", () => {
    const q = quote(studio, "2026-07-03", "2026-07-05", 4);
    // (2200 x 2) + 500 cleaning + (2 extra x 300 x 2 nights)
    expect(q.nightsTotal).toBe(4400);
    expect(q.cleaningFee).toBe(500);
    expect(q.extraGuestFee).toBe(1200);
    expect(q.total).toBe(6100);
  });

  it("charges the cleaning fee once, not per night", () => {
    const one = quote(twoBr, "2026-07-06", "2026-07-07", 2);
    const five = quote(twoBr, "2026-07-06", "2026-07-11", 2);
    expect(one.cleaningFee).toBe(500);
    expect(five.cleaningFee).toBe(500);
  });

  it("reproduces the 11,500 figure shown in the design mockup", () => {
    // Tanaw, Fri 14 to Sun 16 Aug 2026, 5 guests. Aug 14 2026 is a Friday.
    const q = quote(twoBr, "2026-08-14", "2026-08-16", 5);
    expect(q.nights.map((n) => n.basis)).toEqual(["weekend", "weekend"]);
    expect(q.total).toBe(11500);
  });
});

describe("invalid input", () => {
  it("rejects checkout before check-in", () => {
    expect(() => quote(studio, "2026-07-05", "2026-07-03", 2)).toThrow(
      /must be after/,
    );
  });

  it("rejects a zero-night stay", () => {
    expect(() => quote(studio, "2026-07-05", "2026-07-05", 2)).toThrow(
      /must be after/,
    );
  });

  it("rejects an inactive unit", () => {
    const off: Unit = { ...studio, active: false };
    expect(() => quote(off, "2026-07-06", "2026-07-07", 2)).toThrow(/not active/);
  });

  it("rejects a malformed date rather than guessing", () => {
    expect(() => quote(studio, "2026-02-30", "2026-03-02", 2)).toThrow(
      /no such calendar day/,
    );
  });
});

describe("long stays", () => {
  it("falls out to a manual quote instead of inventing a monthly price", () => {
    const q = quote(studio, "2026-07-04", "2026-07-31", 2);
    expect(q.nights).toHaveLength(27);
    expect(q.requiresManualQuote).toBe(false);

    const long = quote(studio, "2026-07-04", "2026-08-04", 2);
    expect(long.requiresManualQuote).toBe(true);
    expect(long.total).toBe(0);
  });

  it("uses 28 nights as the threshold", () => {
    expect(LONG_STAY_NIGHTS).toBe(28);
  });
});

describe("currency formatting", () => {
  it("formats pesos with two decimals and grouping", () => {
    expect(formatPHP(11500)).toBe(PESO + "11,500.00");
    expect(formatPHP(1234.5)).toBe(PESO + "1,234.50");
  });
});
