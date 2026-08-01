import { join } from "node:path";
import { UNITS } from "../../../src/data/units.ts";
import { loadSheet } from "../../../src/data/sheet.ts";
import { nightsBetween, toDateStr } from "../../../src/lib/dates.ts";
import { formatPHP, quote, PricingError } from "../../../src/lib/pricing.ts";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  agoda: "Agoda",
  facebook: "Facebook",
};

export default async function ReportsPage() {
  const today = toDateStr(new Date());
  const { bookings } = loadSheet(join(process.cwd(), "data"));
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));
  const active = UNITS.filter((u) => u.active);

  let totalNights = 0;
  let totalRevenue = 0;
  const revenueBySource = new Map<string, number>();
  const revenueByUnit = new Map<string, number>();
  const nightsByUnit = new Map<string, number>();
  const bookingsBySource = new Map<string, number>();

  for (const b of bookings) {
    let nights = 0;
    try {
      nights = nightsBetween(b.checkIn, b.checkOut);
    } catch {
      continue;
    }
    if (nights <= 0) continue;

    totalNights += nights;
    const src = b.source ?? "unknown";
    bookingsBySource.set(src, (bookingsBySource.get(src) ?? 0) + 1);
    nightsByUnit.set(b.unitId, (nightsByUnit.get(b.unitId) ?? 0) + nights);

    const unit = unitMap.get(b.unitId);
    if (unit && nights < 28) {
      try {
        const p = quote(unit, b.checkIn, b.checkOut, b.guests || 2);
        if (!p.requiresManualQuote) {
          totalRevenue += p.total;
          revenueBySource.set(src, (revenueBySource.get(src) ?? 0) + p.total);
          revenueByUnit.set(
            b.unitId,
            (revenueByUnit.get(b.unitId) ?? 0) + p.total,
          );
        }
      } catch {
        /* skip */
      }
    }
  }

  const totalAvailableNights = active.length * 92;
  const occupancyRate =
    totalAvailableNights > 0
      ? Math.round((totalNights / totalAvailableNights) * 100)
      : 0;

  const avgNightly = totalNights > 0 ? totalRevenue / totalNights : 0;

  const sortedSources = [...revenueBySource.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const sortedUnits = [...revenueByUnit.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <div className="page-head">
        <h1 className="today">Reports</h1>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Total Revenue</p>
          <p className="v" style={{ fontSize: "1.3rem" }}>
            {formatPHP(totalRevenue)}
          </p>
          <p className="s">May-Aug 2026</p>
        </div>
        <div className="tile">
          <p className="k">Occupancy</p>
          <p className="v">{occupancyRate}%</p>
          <p className="s">
            {totalNights} of {totalAvailableNights} nights
          </p>
        </div>
        <div className="tile">
          <p className="k">Avg Nightly</p>
          <p className="v" style={{ fontSize: "1.3rem" }}>
            {formatPHP(avgNightly)}
          </p>
          <p className="s">per occupied night</p>
        </div>
        <div className="tile">
          <p className="k">Total Bookings</p>
          <p className="v">{bookings.length}</p>
          <p className="s">{active.length} active units</p>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h2>
            Revenue by Source{" "}
            <span className="hint">short stays only</span>
          </h2>
          {sortedSources.map(([src, rev]) => {
            const count = bookingsBySource.get(src) ?? 0;
            const pct =
              totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
            return (
              <div className="row" key={src}>
                <span
                  className="stripe"
                  style={{
                    background: `var(--ch-${src === "unknown" ? "block" : src === "facebook" ? "fb" : src})`,
                  }}
                />
                <span style={{ flex: 1 }}>
                  <p className="who">
                    {SOURCE_LABEL[src] ?? src}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-3)",
                        marginLeft: "0.5rem",
                      }}
                    >
                      {count} bookings
                    </span>
                  </p>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: `var(--ch-${src === "unknown" ? "block" : src === "facebook" ? "fb" : src})`,
                      }}
                    />
                  </div>
                </span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  {formatPHP(rev)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h2>
            Revenue by Unit{" "}
            <span className="hint">top 10</span>
          </h2>
          {sortedUnits.map(([uid, rev]) => {
            const u = unitMap.get(uid);
            const nights = nightsByUnit.get(uid) ?? 0;
            const pct =
              totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
            return (
              <div className="row" key={uid}>
                <span className="stripe" style={{ background: "var(--accent)" }} />
                <span style={{ flex: 1 }}>
                  <p className="who">
                    {u ? `${u.tower}-${u.code}` : uid}
                    {u?.name ? (
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-3)",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {u.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="sub">{nights} nights booked</p>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: "var(--accent)" }}
                    />
                  </div>
                </span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  {formatPHP(rev)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h2>
          Bookings by Source <span className="hint">count</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Source</th>
                <th className="tar">Bookings</th>
                <th className="tar">Revenue</th>
                <th className="tar">Share</th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map(([src, rev]) => {
                const count = bookingsBySource.get(src) ?? 0;
                const pct =
                  totalRevenue > 0
                    ? Math.round((rev / totalRevenue) * 100)
                    : 0;
                return (
                  <tr key={src}>
                    <td>
                      <span className={`src-pill ${src}`}>
                        {SOURCE_LABEL[src] ?? src}
                      </span>
                    </td>
                    <td className="tar mono">{count}</td>
                    <td className="tar mono">{formatPHP(rev)}</td>
                    <td className="tar mono">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="notice" style={{ marginTop: "1.5rem" }}>
        <strong>Estimated.</strong> Revenue is calculated from unit rates. Actual
        collected amounts, commission deductions, and expenses require Supabase.
        Cleaning fees and extra guest fees are not yet set, so totals are nightly
        rates only.
      </p>
    </>
  );
}
