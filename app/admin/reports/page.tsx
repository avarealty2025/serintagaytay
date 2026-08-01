import { join } from "node:path";
import Link from "next/link";
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

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 BR",
  "2br": "2 BR",
};

interface UnitReport {
  unitId: string;
  code: string;
  name: string | undefined;
  building: string;
  type: string;
  bookings: number;
  nights: number;
  revenue: number;
  avgNightly: number;
  occupancyPct: number;
}

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
  const bookingsByUnit = new Map<string, number>();

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
    bookingsByUnit.set(b.unitId, (bookingsByUnit.get(b.unitId) ?? 0) + 1);

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

  const unitReports: UnitReport[] = active
    .map((u) => {
      const rev = revenueByUnit.get(u.id) ?? 0;
      const n = nightsByUnit.get(u.id) ?? 0;
      const b = bookingsByUnit.get(u.id) ?? 0;
      return {
        unitId: u.id,
        code: `${u.tower}-${u.code}`,
        name: u.name,
        building: u.buildingId === "west" ? "West" : "East",
        type: TYPE_LABEL[u.type] ?? u.type,
        bookings: b,
        nights: n,
        revenue: rev,
        avgNightly: n > 0 ? rev / n : 0,
        occupancyPct: Math.round((n / 92) * 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

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

      {/* Per-unit report table */}
      <div className="panel">
        <h2>
          Per-Unit Performance{" "}
          <span className="hint">all {active.length} units</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Name</th>
                <th>Type</th>
                <th>Building</th>
                <th className="tar">Bookings</th>
                <th className="tar">Nights</th>
                <th className="tar">Occupancy</th>
                <th className="tar">Revenue</th>
                <th className="tar">Avg/Night</th>
              </tr>
            </thead>
            <tbody>
              {unitReports.map((ur) => (
                <tr key={ur.unitId}>
                  <td>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
                      {ur.code}
                    </span>
                  </td>
                  <td>{ur.name ?? "—"}</td>
                  <td>{ur.type}</td>
                  <td>{ur.building}</td>
                  <td className="tar mono">{ur.bookings}</td>
                  <td className="tar mono">{ur.nights}</td>
                  <td className="tar">
                    <span
                      className={`status-pill ${ur.occupancyPct >= 60 ? "ok" : ur.occupancyPct >= 30 ? "warn" : ""}`}
                      style={
                        ur.occupancyPct < 30
                          ? {
                              background:
                                "color-mix(in srgb, var(--crit) 18%, transparent)",
                              color: "var(--crit)",
                            }
                          : undefined
                      }
                    >
                      {ur.occupancyPct}%
                    </span>
                  </td>
                  <td className="tar mono" style={{ fontWeight: 700 }}>
                    {formatPHP(ur.revenue)}
                  </td>
                  <td className="tar mono">
                    {ur.avgNightly > 0 ? formatPHP(ur.avgNightly) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                <td colSpan={4}>Total</td>
                <td className="tar mono">
                  {unitReports.reduce((s, u) => s + u.bookings, 0)}
                </td>
                <td className="tar mono">{totalNights}</td>
                <td className="tar">{occupancyRate}%</td>
                <td className="tar mono">{formatPHP(totalRevenue)}</td>
                <td className="tar mono">{formatPHP(avgNightly)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top performers */}
      <div className="cols">
        <div className="panel">
          <h2>
            Top Revenue Units{" "}
            <span className="hint">top 5</span>
          </h2>
          {unitReports.slice(0, 5).map((ur) => {
            const pct =
              totalRevenue > 0
                ? Math.round((ur.revenue / totalRevenue) * 100)
                : 0;
            return (
              <div className="row" key={ur.unitId}>
                <span
                  className="stripe"
                  style={{ background: "var(--accent)" }}
                />
                <span style={{ flex: 1 }}>
                  <p className="who">
                    {ur.code}
                    {ur.name ? (
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-3)",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {ur.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="sub">
                    {ur.bookings} bookings &middot; {ur.nights} nights &middot;{" "}
                    {ur.occupancyPct}% occupancy
                  </p>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  {formatPHP(ur.revenue)}
                </span>
              </div>
            );
          })}
        </div>

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
        <strong>Estimated.</strong> Revenue is calculated from unit rates.
        Actual collected amounts, commission deductions, and expenses require
        Supabase. Cleaning fees and extra guest fees are not yet set, so totals
        are nightly rates only. Per-unit expense data will be available once
        Supabase is connected.
      </p>
    </>
  );
}
