import Link from "next/link";
import { UNITS } from "../../src/data/units.ts";
import { getBookings } from "../../src/data/db.ts";
import { findAllOverlaps } from "../../src/lib/availability.ts";
import { dayOfWeek, nightsBetween, toDateStr, addDays } from "../../src/lib/dates.ts";
import { formatPHP, quote } from "../../src/lib/pricing.ts";
import { getSettings } from "../../src/lib/settings.ts";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function Dashboard() {
  const today = toDateStr(new Date());
  const settings = getSettings();
  const { bookings, problems } = await getBookings();
  const overlaps = findAllOverlaps(bookings);
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));
  const active = UNITS.filter((u) => u.active);

  const arrivals = bookings.filter((b) => b.checkIn === today);
  const departures = bookings.filter((b) => b.checkOut === today);
  const inHouse = bookings.filter((b) => b.checkIn <= today && b.checkOut > today);
  const tomorrow = addDays(today, 1);
  const tomorrowArrivals = bookings.filter((b) => b.checkIn === tomorrow);

  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  let totalNights = 0;
  const monthPrefix = today.slice(0, 7);

  for (const b of bookings) {
    let nights = 0;
    try {
      nights = nightsBetween(b.checkIn, b.checkOut);
    } catch {
      continue;
    }
    if (nights <= 0 || nights >= 28) continue;
    totalNights += nights;
    const unit = unitMap.get(b.unitId);
    if (!unit) continue;
    try {
      const p = quote(unit, b.checkIn, b.checkOut, b.guests || 2);
      if (!p.requiresManualQuote) {
        totalRevenue += p.total;
        if (b.checkIn.startsWith(monthPrefix)) {
          thisMonthRevenue += p.total;
        }
      }
    } catch { /* skip */ }
  }

  const totalAvailableNights = active.length * 92;
  const occupancyRate = totalAvailableNights > 0
    ? Math.round((totalNights / totalAvailableNights) * 100) : 0;
  const occupiedTonight = inHouse.length;
  const availableTonight = active.length - occupiedTonight;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Dashboard</h1>
          <p className="dash-date">
            {DOW[dayOfWeek(today)]}, {today}
            <span className="dash-time">
              Check-in {settings.booking.checkInTime.replace(":00", "")} / Check-out {settings.booking.checkOutTime.replace(":00", "")}
            </span>
          </p>
        </div>
        <Link href="/admin/bookings/new" className="btn">
          + New Booking
        </Link>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Total Revenue</p>
          <p className="v" style={{ fontSize: "1.2rem" }}>
            {formatPHP(totalRevenue)}
          </p>
          <p className="s">all bookings</p>
        </div>
        <div className="tile">
          <p className="k">This Month</p>
          <p className="v" style={{ fontSize: "1.2rem" }}>
            {formatPHP(thisMonthRevenue)}
          </p>
          <p className="s">{monthPrefix}</p>
        </div>
        <div className="tile">
          <p className="k">Occupancy</p>
          <p className="v">{occupancyRate}%</p>
          <p className="s">{totalNights} of {totalAvailableNights} nights</p>
        </div>
        <div className="tile">
          <p className="k">Available Tonight</p>
          <p className="v">{availableTonight}</p>
          <p className="s">of {active.length} units</p>
        </div>
        <div className="tile">
          <p className="k">Arrivals Today</p>
          <p className="v">{arrivals.length}</p>
          <p className="s">{tomorrowArrivals.length} tomorrow</p>
        </div>
        <div className="tile">
          <p className="k">Departures Today</p>
          <p className="v">{departures.length}</p>
          <p className="s">checkouts</p>
        </div>
        <div className={overlaps.length ? "tile alert" : "tile"}>
          <p className="k">Conflicts</p>
          <p className="v">{overlaps.length}</p>
          <p className="s">double-bookings</p>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h2>
            Arriving Today <span className="hint">{arrivals.length} guests</span>
          </h2>
          {arrivals.length === 0 ? (
            <div className="row">
              <span className="stripe ok" />
              <span><p className="who">No arrivals today</p></span>
            </div>
          ) : (
            arrivals.map((b) => (
              <div className="row" key={b.id}>
                <span className="stripe ok" />
                <span>
                  <p className="who">{b.guest || "(no name)"}</p>
                  <p className="sub">
                    {b.unitId} &middot; {b.source ?? "unknown"} &middot;
                    {b.checkIn} to {b.checkOut}
                  </p>
                </span>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <h2>
            Departing Today <span className="hint">{departures.length} guests</span>
          </h2>
          {departures.length === 0 ? (
            <div className="row">
              <span className="stripe ok" />
              <span><p className="who">No departures today</p></span>
            </div>
          ) : (
            departures.map((b) => (
              <div className="row" key={b.id}>
                <span className="stripe due" />
                <span>
                  <p className="who">{b.guest || "(no name)"}</p>
                  <p className="sub">
                    {b.unitId} &middot; {b.source ?? "unknown"}
                  </p>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <h2>
          In House <span className="hint">{inHouse.length} staying tonight</span>
        </h2>
        {inHouse.length === 0 ? (
          <div className="row">
            <span className="stripe" style={{ background: "var(--accent)" }} />
            <span><p className="who">No guests in house</p></span>
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {inHouse.map((b) => {
                  const u = unitMap.get(b.unitId);
                  return (
                    <tr key={b.id}>
                      <td className="mono">
                        {u ? `${u.tower}-${u.code}` : b.unitId}
                      </td>
                      <td>{b.guest || "(no name)"}</td>
                      <td className="mono">{b.checkIn}</td>
                      <td className="mono">{b.checkOut}</td>
                      <td>
                        <span className={`src-pill ${b.source ?? "unknown"}`}>
                          {b.source ?? "unknown"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overlaps.length > 0 && (
        <div className="warnbox" style={{ marginBottom: "1.5rem" }}>
          <span>
            <strong>{overlaps.length} double-bookings in the source data.</strong>{" "}
            Resolve before migrating to the database.
          </span>
        </div>
      )}

      {problems.length > 0 && (
        <div className="panel">
          <h2>
            Data Issues <span className="hint">{problems.length} unparsed rows</span>
          </h2>
          {problems.slice(0, 10).map((p) => (
            <div className="row" key={p}>
              <span className="stripe due" />
              <span><p className="sub">{p}</p></span>
            </div>
          ))}
          {problems.length > 10 && (
            <div className="row">
              <span className="stripe" />
              <span>
                <p className="sub">...and {problems.length - 10} more</p>
              </span>
            </div>
          )}
        </div>
      )}

      <p className="foot">
        Reading {bookings.length} bookings from the owner&rsquo;s sheet.
        {" "}Revenue is estimated from unit rates (cleaning fees and extra guest fees not yet set).
      </p>
    </>
  );
}
