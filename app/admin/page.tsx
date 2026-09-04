import Link from "next/link";
import { UNITS } from "../../src/data/units.ts";
import { getBookings } from "../../src/data/db.ts";
import { findAllOverlaps } from "../../src/lib/availability.ts";
import { dayOfWeek, nightsBetween, toDateStr, addDays } from "../../src/lib/dates.ts";
import { formatPHP, quote } from "../../src/lib/pricing.ts";
import { getSettings } from "../../src/lib/settings.ts";
import { StatusBtn } from "./bookings/_status-btn.tsx";
import { CollectBtn } from "./bookings/_collect-btn.tsx";
import { MyTasksPanel } from "./_my-tasks.tsx";
import { LiveClock } from "./_live-clock.tsx";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GONE = new Set(["checked_out", "cancelled", "payment_rejected", "expired", "no_show", "blocked"]);

function BalancePill({ gross, paid }: { gross: number; paid: number }) {
  if (gross <= 0) return null;
  const bal = gross - paid;
  if (bal <= 0) {
    return (
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#fff", background: "var(--good)", padding: "0.15rem 0.5rem", borderRadius: "9px", whiteSpace: "nowrap" }}>
        Fully Paid
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#fff", background: "var(--crit, #c0392b)", padding: "0.15rem 0.5rem", borderRadius: "9px", whiteSpace: "nowrap" }}>
      Collect {formatPHP(bal)}
    </span>
  );
}

export default async function Dashboard() {
  const today = toDateStr(new Date());
  const settings = getSettings();
  const { bookings, problems } = await getBookings();
  const overlaps = findAllOverlaps(bookings);
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));
  const active = UNITS.filter((u) => u.active);

  const live = bookings.filter((b) => !GONE.has(b.status));

  const arrivals = live.filter((b) => b.checkIn === today && b.status !== "checked_in");
  const departures = live.filter((b) => b.checkOut === today);
  const inHouse = live.filter((b) => b.checkIn <= today && b.checkOut > today);
  const tomorrow = addDays(today, 1);
  const tomorrowArrivals = live.filter((b) => b.checkIn === tomorrow);

  const upcoming = live.filter(
    (b) => b.checkIn > today && b.status !== "checked_in",
  ).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 10);

  let totalNights = 0;

  const unitMonthRevenue = new Map<string, Map<string, number>>();

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
        const month = b.checkIn.slice(0, 7);
        if (!unitMonthRevenue.has(b.unitId)) {
          unitMonthRevenue.set(b.unitId, new Map());
        }
        const monthMap = unitMonthRevenue.get(b.unitId)!;
        monthMap.set(month, (monthMap.get(month) ?? 0) + p.total);
      }
    } catch { /* skip */ }
  }

  const allMonths = new Set<string>();
  for (const monthMap of unitMonthRevenue.values()) {
    for (const m of monthMap.keys()) allMonths.add(m);
  }
  const sortedMonths = [...allMonths].sort().reverse();

  const unitIdsWithRevenue = [...unitMonthRevenue.keys()].sort();

  const totalAvailableNights = active.length * 92;
  const occupancyRate = totalAvailableNights > 0
    ? Math.round((totalNights / totalAvailableNights) * 100) : 0;
  const occupiedTonight = inHouse.length;
  const availableTonight = active.length - occupiedTonight;

  const checkedOutToday = bookings.filter(
    (b) => b.checkOut === today && b.status === "checked_out",
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Dashboard</h1>
          <LiveClock refreshInterval={60} />
          <p className="dash-date">
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
          <p className="k">In House</p>
          <p className="v">{inHouse.length}</p>
          <p className="s">staying tonight</p>
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
              <div className="row" key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="stripe ok" />
                  <span>
                    <p className="who">{b.guest || "(no name)"}</p>
                    <p className="sub">
                      {b.unitId} &middot; {b.source ?? "unknown"} &middot;
                      {b.checkIn} to {b.checkOut}
                    </p>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <BalancePill gross={b.grossAmount} paid={b.amountPaid} />
                  <CollectBtn bookingId={b.id} balance={b.grossAmount - b.amountPaid} collectedBy={b.collectedBy} collectedAt={b.collectedAt} />
                  <StatusBtn
                    bookingId={b.id}
                    action="checked_in"
                    label="Check In"
                    confirmMsg={`Check in ${b.guest || "this guest"}?`}
                  />
                </div>
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
              <div className="row" key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="stripe due" />
                  <span>
                    <p className="who">{b.guest || "(no name)"}</p>
                    <p className="sub">
                      {b.unitId} &middot; {b.source ?? "unknown"}
                    </p>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <BalancePill gross={b.grossAmount} paid={b.amountPaid} />
                  <CollectBtn bookingId={b.id} balance={b.grossAmount - b.amountPaid} collectedBy={b.collectedBy} collectedAt={b.collectedAt} />
                  <StatusBtn
                    bookingId={b.id}
                    action="checked_out"
                    label="Check Out"
                    confirmMsg={`Check out ${b.guest || "this guest"}?`}
                  />
                </div>
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
                  <th>Balance</th>
                  <th></th>
                  <th></th>
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
                      <td>
                        <BalancePill gross={b.grossAmount} paid={b.amountPaid} />
                      </td>
                      <td>
                        <CollectBtn bookingId={b.id} balance={b.grossAmount - b.amountPaid} collectedBy={b.collectedBy} collectedAt={b.collectedAt} />
                      </td>
                      <td>
                        <StatusBtn
                          bookingId={b.id}
                          action="checked_out"
                          label="Check Out"
                          confirmMsg={`Check out ${b.guest || "this guest"} from ${u ? `${u.tower}-${u.code}` : b.unitId}?`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="panel">
          <h2>
            Upcoming <span className="hint">next {upcoming.length} arrivals</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Source</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => {
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
                      <td>
                        <BalancePill gross={b.grossAmount} paid={b.amountPaid} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {checkedOutToday.length > 0 && (
        <div className="panel" style={{ opacity: 0.7 }}>
          <h2>
            Checked Out Today <span className="hint">{checkedOutToday.length}</span>
          </h2>
          {checkedOutToday.map((b) => (
            <div className="row" key={b.id}>
              <span className="stripe" style={{ background: "var(--text-3)" }} />
              <span>
                <p className="who" style={{ textDecoration: "line-through", color: "var(--text-3)" }}>{b.guest || "(no name)"}</p>
                <p className="sub">{b.unitId}</p>
              </span>
            </div>
          ))}
        </div>
      )}

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

      <MyTasksPanel />

      {unitIdsWithRevenue.length > 0 && (
        <div className="panel">
          <h2>Revenue Per Unit Per Month</h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  {sortedMonths.map((m) => (
                    <th key={m} className="tar">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unitIdsWithRevenue.map((uid) => {
                  const u = unitMap.get(uid);
                  const monthMap = unitMonthRevenue.get(uid)!;
                  return (
                    <tr key={uid}>
                      <td className="mono">{u ? `${u.tower}-${u.code}` : uid}</td>
                      {sortedMonths.map((m) => (
                        <td key={m} className="tar mono">
                          {monthMap.has(m) ? formatPHP(monthMap.get(m)!) : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="foot">
        Reading {bookings.length} bookings.
        {" "}Revenue is estimated from unit rates.
        {" "}<Link href="/admin/bookings/history" style={{ color: "var(--accent)", fontSize: "0.8rem" }}>View History</Link>
      </p>
    </>
  );
}
