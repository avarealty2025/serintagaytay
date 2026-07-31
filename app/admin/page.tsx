import { join } from "node:path";
import Link from "next/link";
import { Mark } from "../mark.tsx";
import { UNITS } from "../../src/data/units.ts";
import { loadSheet } from "../../src/data/sheet.ts";
import { findAllOverlaps } from "../../src/lib/availability.ts";
import { addDays, dayOfWeek, nightsBetween, toDateStr } from "../../src/lib/dates.ts";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WINDOW = 14;

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const start = sp.from || today;

  const { bookings, problems, rowsSeen } = loadSheet(join(process.cwd(), "data"));
  const overlaps = findAllOverlaps(bookings);

  const days = Array.from({ length: WINDOW }, (_, i) => addDays(start, i));
  const windowEnd = addDays(start, WINDOW);

  const active = UNITS.filter((u) => u.active);

  const arrivals = bookings.filter((b) => b.checkIn === today);
  const departures = bookings.filter((b) => b.checkOut === today);
  const inHouse = bookings.filter((b) => b.checkIn < today && b.checkOut > today);

  // Only render units that have something in the window, so the grid stays
  // usable. Everything else is still counted in the tiles above.
  const visible = active.filter((u) =>
    bookings.some(
      (b) => b.unitId === u.id && b.checkIn < windowEnd && b.checkOut > start,
    ),
  );
  const rows = visible.length ? visible : active.slice(0, 10);

  const gridCols = `7.5rem repeat(${WINDOW}, var(--col))`;

  return (
    <div className="shell">
      <aside className="side">
        <div className="lockup">
          <Mark />
          <p className="brand">
            Serin
            <small>Tagaytay</small>
          </p>
        </div>
        <nav className="navgrp">
          <h3>Operations</h3>
          <a className="on" href="#today">
            Today <span className="ct">{arrivals.length}</span>
          </a>
          <a href="#cal">Calendar</a>
          <a href="#data">
            Data issues{" "}
            <span className={overlaps.length ? "ct hot" : "ct"}>
              {overlaps.length + problems.length}
            </span>
          </a>
        </nav>
        <nav className="navgrp">
          <h3>Site</h3>
          <Link href="/">Public site</Link>
        </nav>
      </aside>

      <main className="main">
        <h1 className="today">
          {DOW[dayOfWeek(today)]}, {today}
        </h1>

        <div className="tiles" id="today">
          <div className="tile">
            <p className="k">Arrivals</p>
            <p className="v">{arrivals.length}</p>
            <p className="s">today</p>
          </div>
          <div className="tile">
            <p className="k">Departures</p>
            <p className="v">{departures.length}</p>
            <p className="s">today</p>
          </div>
          <div className="tile">
            <p className="k">In house</p>
            <p className="v">{inHouse.length}</p>
            <p className="s">staying tonight</p>
          </div>
          <div className="tile">
            <p className="k">Active units</p>
            <p className="v">{active.length}</p>
            <p className="s">of {UNITS.length} seeded</p>
          </div>
          <div className={overlaps.length ? "tile alert" : "tile"}>
            <p className="k">Conflicts</p>
            <p className="v">{overlaps.length}</p>
            <p className="s">in the sheet</p>
          </div>
        </div>

        {overlaps.length > 0 && (
          <div className="panel">
            <div className="warnbox">
              <span>
                <strong>
                  {overlaps.length} double-bookings exist in the source sheet.
                </strong>{" "}
                Each must be resolved before the data is migrated. Once the
                exclusion constraint is live, none of these can be entered again.
              </span>
            </div>
          </div>
        )}

        <div className="panel" id="cal">
          <h2>
            Unified calendar
            <span className="hint">
              {start} to {addDays(start, WINDOW - 1)} &middot; every source in one grid
            </span>
          </h2>
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

              {rows.map((u, r) => {
                const bars = bookings.filter(
                  (b) => b.unitId === u.id && b.checkIn < windowEnd && b.checkOut > start,
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
                      const to = Math.min(
                        WINDOW,
                        nightsBetween(start, b.checkOut),
                      );
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

        <div className="cols" id="data">
          <div className="panel">
            <h2>
              Conflicts <span className="hint">resolve before migrating</span>
            </h2>
            {overlaps.length === 0 ? (
              <div className="row">
                <span className="stripe ok" />
                <span>
                  <p className="who">No overlaps</p>
                  <p className="sub">Every booking in the sheet is consistent.</p>
                </span>
              </div>
            ) : (
              overlaps.map(([a, b], i) => (
                <div className="row" key={i}>
                  <span className="stripe due" />
                  <span>
                    <p className="who">{a.unitId}</p>
                    <p className="sub">
                      {a.checkIn} to {a.checkOut} &mdash;{" "}
                      {(a as { guest?: string }).guest || "(no name)"}
                    </p>
                    <p className="sub">
                      {b.checkIn} to {b.checkOut} &mdash;{" "}
                      {(b as { guest?: string }).guest || "(no name)"}
                    </p>
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <h2>
              Unparsed rows <span className="hint">need owner input</span>
            </h2>
            {problems.length === 0 ? (
              <div className="row">
                <span className="stripe ok" />
                <span>
                  <p className="who">All rows parsed</p>
                </span>
              </div>
            ) : (
              problems.map((p) => (
                <div className="row" key={p}>
                  <span className="stripe due" />
                  <span>
                    <p className="sub">{p}</p>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="foot">
          Reading {bookings.length} of {rowsSeen} rows from the owner&rsquo;s sheet.
          No database is connected yet &mdash; see <code>SETUP.md</code>. Once the
          migrations are applied this page reads from Postgres and{" "}
          <code>src/data/sheet.ts</code> is deleted.
        </p>
      </main>
    </div>
  );
}
