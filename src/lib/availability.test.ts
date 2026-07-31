import { describe, expect, it } from "vitest";
import { findAllOverlaps, findConflicts, isAvailable } from "./availability.ts";
import { RELEASING_STATUSES, blocksDates } from "./types.ts";
import type { BookingRange, BookingStatus } from "./types.ts";

const UNIT = "u-919";
const OTHER = "u-210";

function bk(
  id: string,
  checkIn: string,
  checkOut: string,
  status: BookingStatus = "confirmed",
  unitId = UNIT,
): BookingRange {
  return { id, unitId, checkIn, checkOut, status };
}

describe("overlap rejection", () => {
  const existing = [bk("a", "2026-07-04", "2026-07-08")];

  it("rejects a stay fully inside an existing one", () => {
    expect(isAvailable(UNIT, "2026-07-05", "2026-07-07", existing)).toBe(false);
  });

  it("rejects a stay that swallows an existing one", () => {
    expect(isAvailable(UNIT, "2026-07-01", "2026-07-12", existing)).toBe(false);
  });

  it("rejects an overlap on the front edge", () => {
    expect(isAvailable(UNIT, "2026-07-02", "2026-07-05", existing)).toBe(false);
  });

  it("rejects an overlap on the back edge", () => {
    expect(isAvailable(UNIT, "2026-07-07", "2026-07-10", existing)).toBe(false);
  });

  it("rejects an identical range", () => {
    expect(isAvailable(UNIT, "2026-07-04", "2026-07-08", existing)).toBe(false);
  });

  it("reports which booking caused the clash", () => {
    const conflicts = findConflicts(UNIT, "2026-07-05", "2026-07-06", existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.bookingId).toBe("a");
  });
});

describe("checkout-day turnover", () => {
  const existing = [bk("a", "2026-07-04", "2026-07-08")];

  it("allows a new check-in on the departing guest's checkout day", () => {
    // The half-open rule. The 8th is the first night NOT occupied by "a".
    expect(isAvailable(UNIT, "2026-07-08", "2026-07-10", existing)).toBe(true);
  });

  it("allows a stay ending on the arriving guest's check-in day", () => {
    expect(isAvailable(UNIT, "2026-07-01", "2026-07-04", existing)).toBe(true);
  });

  it("allows back-to-back-to-back turnovers with no gap", () => {
    const chain = [
      bk("a", "2026-07-04", "2026-07-05"),
      bk("b", "2026-07-05", "2026-07-06"),
      bk("c", "2026-07-06", "2026-07-07"),
    ];
    expect(findAllOverlaps(chain)).toHaveLength(0);
  });
});

describe("status affects whether dates are held", () => {
  it.each(RELEASING_STATUSES)("releases dates when %s", (status) => {
    const existing = [bk("a", "2026-07-04", "2026-07-08", status)];
    expect(isAvailable(UNIT, "2026-07-05", "2026-07-06", existing)).toBe(true);
  });

  it.each([
    "pending_payment",
    "confirmed",
    "checked_in",
    "checked_out",
    "no_show",
    "blocked",
  ] as BookingStatus[])("holds dates when %s", (status) => {
    const existing = [bk("a", "2026-07-04", "2026-07-08", status)];
    expect(isAvailable(UNIT, "2026-07-05", "2026-07-06", existing)).toBe(false);
  });

  it("holds dates for a no-show, per the owner's decision", () => {
    // If this ever flips, RELEASING_STATUSES and the WHERE clause of
    // bookings_no_overlap must change together.
    expect(blocksDates("no_show")).toBe(true);
    expect(RELEASING_STATUSES).not.toContain("no_show");
  });

  it("keeps a pending hold blocking while it is unpaid", () => {
    // An unpaid hold must block our calendar AND our published iCal feed, or
    // an Airbnb guest can take the same night.
    expect(blocksDates("pending_payment")).toBe(true);
  });
});

describe("scoping", () => {
  it("does not clash across different units", () => {
    const existing = [bk("a", "2026-07-04", "2026-07-08", "confirmed", OTHER)];
    expect(isAvailable(UNIT, "2026-07-04", "2026-07-08", existing)).toBe(true);
  });

  it("can ignore a booking being edited so it does not clash with itself", () => {
    const existing = [bk("a", "2026-07-04", "2026-07-08")];
    expect(
      isAvailable(UNIT, "2026-07-04", "2026-07-09", existing, {
        ignoreBookingId: "a",
      }),
    ).toBe(true);
  });
});

describe("findAllOverlaps, used to validate the imported history", () => {
  it("finds nothing in a clean set", () => {
    expect(
      findAllOverlaps([
        bk("a", "2026-07-01", "2026-07-03"),
        bk("b", "2026-07-03", "2026-07-05"),
        bk("c", "2026-07-10", "2026-07-12"),
      ]),
    ).toHaveLength(0);
  });

  it("finds a genuine clash", () => {
    const pairs = findAllOverlaps([
      bk("a", "2026-07-01", "2026-07-05"),
      bk("b", "2026-07-04", "2026-07-06"),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });

  it("ignores clashes between cancelled bookings", () => {
    expect(
      findAllOverlaps([
        bk("a", "2026-07-01", "2026-07-05", "cancelled"),
        bk("b", "2026-07-04", "2026-07-06", "cancelled"),
      ]),
    ).toHaveLength(0);
  });

  it("separates units correctly in a mixed set", () => {
    const pairs = findAllOverlaps([
      bk("a", "2026-07-01", "2026-07-05", "confirmed", UNIT),
      bk("b", "2026-07-02", "2026-07-06", "confirmed", OTHER),
    ]);
    expect(pairs).toHaveLength(0);
  });

  it("finds every colliding pair when three bookings stack", () => {
    const pairs = findAllOverlaps([
      bk("a", "2026-07-01", "2026-07-10"),
      bk("b", "2026-07-02", "2026-07-04"),
      bk("c", "2026-07-03", "2026-07-06"),
    ]);
    expect(pairs).toHaveLength(3);
  });
});
