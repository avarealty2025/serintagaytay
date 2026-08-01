import { join } from "node:path";
import { UNITS } from "../../src/data/units.ts";
import { loadSheet } from "../../src/data/sheet.ts";
import { findAllOverlaps } from "../../src/lib/availability.ts";
import { dayOfWeek, toDateStr } from "../../src/lib/dates.ts";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminToday() {
  const today = toDateStr(new Date());
  const { bookings, problems, rowsSeen } = loadSheet(join(process.cwd(), "data"));
  const overlaps = findAllOverlaps(bookings);

  const active = UNITS.filter((u) => u.active);
  const arrivals = bookings.filter((b) => b.checkIn === today);
  const departures = bookings.filter((b) => b.checkOut === today);
  const inHouse = bookings.filter((b) => b.checkIn < today && b.checkOut > today);

  return (
    <>
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

      {arrivals.length > 0 && (
        <div className="panel">
          <h2>
            Arriving today <span className="hint">{arrivals.length} guests</span>
          </h2>
          {arrivals.map((b) => (
            <div className="row" key={b.id}>
              <span className="stripe ok" />
              <span>
                <p className="who">{b.guest || "(no name)"}</p>
                <p className="sub">
                  {b.unitId} &middot; {b.source ?? "unknown"} &middot; {b.checkIn}{" "}
                  to {b.checkOut}
                </p>
              </span>
            </div>
          ))}
        </div>
      )}

      {departures.length > 0 && (
        <div className="panel">
          <h2>
            Departing today{" "}
            <span className="hint">{departures.length} guests</span>
          </h2>
          {departures.map((b) => (
            <div className="row" key={b.id}>
              <span className="stripe due" />
              <span>
                <p className="who">{b.guest || "(no name)"}</p>
                <p className="sub">
                  {b.unitId} &middot; {b.source ?? "unknown"}
                </p>
              </span>
            </div>
          ))}
        </div>
      )}

      {inHouse.length > 0 && (
        <div className="panel">
          <h2>
            In house <span className="hint">{inHouse.length} staying</span>
          </h2>
          {inHouse.map((b) => (
            <div className="row" key={b.id}>
              <span className="stripe" style={{ background: "var(--accent)" }} />
              <span>
                <p className="who">{b.guest || "(no name)"}</p>
                <p className="sub">
                  {b.unitId} &middot; departs {b.checkOut} &middot;{" "}
                  {b.source ?? "unknown"}
                </p>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="cols">
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
        Reading {bookings.length} of {rowsSeen} rows from the owner&rsquo;s
        sheet. No database is connected yet &mdash; see <code>SETUP.md</code>.
      </p>
    </>
  );
}
