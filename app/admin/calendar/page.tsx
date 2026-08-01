import { join } from "node:path";
import { UNITS } from "../../../src/data/units.ts";
import { loadSheet } from "../../../src/data/sheet.ts";
import { addDays, dayOfWeek, nightsBetween, toDateStr } from "../../../src/lib/dates.ts";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WINDOW = 28;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const start = sp.from || today;
  const windowEnd = addDays(start, WINDOW);

  const { bookings } = loadSheet(join(process.cwd(), "data"));
  const active = UNITS.filter((u) => u.active);
  const days = Array.from({ length: WINDOW }, (_, i) => addDays(start, i));

  const gridCols = `7.5rem repeat(${WINDOW}, var(--col))`;

  const prevStart = addDays(start, -WINDOW);
  const nextStart = addDays(start, WINDOW);

  return (
    <>
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

      <div className="panel">
        <div className="tlscroll">
          <div className="tl" style={{ gridTemplateColumns: gridCols }}>
            <div className="corner">Unit</div>
            {days.map((d, i) => {
              const dw = dayOfWeek(d);
              const cls =
                d === today ? "dh now" : dw === 0 || dw === 6 ? "dh we" : "dh";
              return (
                <div key={d} className={cls} style={{ gridColumn: i + 2 }}>
                  <span className="dow">{DOW[dw]}</span>
                  <span className="dd">{Number(d.slice(8, 10))}</span>
                </div>
              );
            })}

            {days.map((d, i) => {
              const dw = dayOfWeek(d);
              if (dw !== 0 && dw !== 6) return null;
              return (
                <div
                  key={`s${d}`}
                  className="colshade"
                  style={{ gridColumn: i + 2 }}
                />
              );
            })}

            {active.map((u, r) => {
              const bars = bookings.filter(
                (b) =>
                  b.unitId === u.id &&
                  b.checkIn < windowEnd &&
                  b.checkOut > start,
              );
              return (
                <div key={u.id} style={{ display: "contents" }}>
                  <div className="ul" style={{ gridRow: r + 2 }}>
                    <span className="uc">
                      {u.tower}-{u.code}
                      {u.buildingId === "east" ? " E" : ""}
                    </span>
                    <span className="un">
                      {u.name ?? (u.buildingId === "west" ? "West" : "East")}
                    </span>
                  </div>
                  <div className="rowbg" style={{ gridRow: r + 2 }} />
                  {bars.map((b) => {
                    const from = Math.max(0, nightsBetween(start, b.checkIn));
                    const to = Math.min(WINDOW, nightsBetween(start, b.checkOut));
                    if (to <= from) return null;
                    return (
                      <div
                        key={b.id}
                        className={`bar ${b.source ?? "unknown"}`}
                        style={{
                          gridRow: r + 2,
                          gridColumn: `${from + 2} / ${to + 2}`,
                        }}
                        title={`${b.guest || "(no name)"} - ${b.checkIn} to ${b.checkOut}`}
                      >
                        {b.guest || "(no name)"}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="legend">
          <span>
            <b style={{ background: "var(--ch-direct)" }} />
            Direct
          </span>
          <span>
            <b style={{ background: "var(--ch-airbnb)" }} />
            Airbnb
          </span>
          <span>
            <b style={{ background: "var(--ch-agoda)" }} />
            Agoda
          </span>
          <span>
            <b style={{ background: "var(--ch-fb)" }} />
            Facebook
          </span>
          <span>
            <b style={{ background: "var(--ch-block)" }} />
            Unlabelled
          </span>
        </div>
      </div>
    </>
  );
}
