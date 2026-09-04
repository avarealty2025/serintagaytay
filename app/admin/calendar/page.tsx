import { UNITS } from "../../../src/data/units.ts";
import { getBookings } from "../../../src/data/db.ts";
import { addDays, dayOfWeek, nightsBetween, toDateStr } from "../../../src/lib/dates.ts";
import { AutoRefresh } from "../_auto-refresh.tsx";
import { InteractiveCalendar } from "./_interactive-calendar.tsx";

export const dynamic = "force-dynamic";

const WINDOW = 28;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const start = sp.from || today;

  const { bookings } = await getBookings();
  const active = UNITS.filter((u) => u.active);
  const days = Array.from({ length: WINDOW }, (_, i) => addDays(start, i));

  const prevStart = addDays(start, -WINDOW);
  const nextStart = addDays(start, WINDOW);

  const windowEnd = addDays(start, WINDOW);
  const calBookings = bookings
    .filter((b) => b.checkIn < windowEnd && b.checkOut > start)
    .map((b) => ({
      id: b.id,
      unitId: b.unitId,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guest: b.guest,
      source: b.source,
      status: b.status,
    }));

  const calUnits = active.map((u) => ({
    id: u.id,
    tower: u.tower,
    code: u.code,
    buildingId: u.buildingId,
    name: u.name,
  }));

  return (
    <>
      <AutoRefresh interval={60} />
      <div className="cal-head">
        <h1 className="today">Unified Calendar</h1>
        <div className="cal-nav">
          <a href={`/admin/calendar?from=${prevStart}`} className="btn btn-sm">
            &larr; Previous
          </a>
          <span className="cal-range">
            {start} to {addDays(start, WINDOW - 1)}
          </span>
          <a href={`/admin/calendar?from=${nextStart}`} className="btn btn-sm">
            Next &rarr;
          </a>
        </div>
      </div>

      <InteractiveCalendar
        units={calUnits}
        bookings={calBookings}
        days={days}
        start={start}
        today={today}
        windowSize={WINDOW}
      />
    </>
  );
}
