import { Fragment } from "react";
import { getBookings } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { nightsBetween } from "../../../../src/lib/dates.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParkingReportPage() {
  const { bookings } = await getBookings();
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const parkingBookings = bookings.filter(
    (b) =>
      (b.parkingSlot || b.parkingFee > 0) &&
      b.status !== "cancelled" &&
      b.status !== "payment_rejected" &&
      b.status !== "expired",
  );

  interface ParkingRow {
    id: string;
    checkIn: string;
    checkOut: string;
    unitCode: string;
    unitName: string;
    guest: string;
    slot: string;
    feeType: string;
    nights: number;
    amount: number;
    month: string;
  }

  const rows: ParkingRow[] = [];
  for (const b of parkingBookings) {
    let nights = 0;
    try {
      nights = nightsBetween(b.checkIn, b.checkOut);
    } catch {
      continue;
    }
    if (nights <= 0) continue;

    const unit = unitMap.get(b.unitId);
    const fee = b.parkingFee || 0;
    const total =
      fee > 0
        ? b.parkingFeeType === "per_night"
          ? fee * nights
          : fee
        : 0;

    rows.push({
      id: b.id,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      unitCode: unit ? `${unit.tower}-${unit.code}` : b.unitId,
      unitName: unit?.name ?? "",
      guest: b.guest || "(no name)",
      slot: b.parkingSlot || "—",
      feeType: b.parkingFeeType === "per_night" ? "Per Night" : "One-Time",
      nights,
      amount: total,
      month: b.checkIn.slice(0, 7),
    });
  }

  rows.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const monthlyTotals = new Map<string, number>();
  for (const r of rows) {
    monthlyTotals.set(r.month, (monthlyTotals.get(r.month) ?? 0) + r.amount);
  }
  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function formatMonth(m: string) {
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[Number(mo) - 1]} ${y}`;
  }

  const months = [...monthlyTotals.keys()].sort();

  return (
    <>
      <div className="page-head">
        <h1 className="today">Parking Report</h1>
        <p style={{ color: "var(--text-3)", margin: "0.25rem 0 0" }}>
          All bookings with parking fees
        </p>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Total Parking Revenue</p>
          <p className="v" style={{ fontSize: "1.3rem" }}>
            {formatPHP(grandTotal)}
          </p>
          <p className="s">{rows.length} bookings with parking</p>
        </div>
        {months.map((m) => (
          <div className="tile" key={m}>
            <p className="k">{formatMonth(m)}</p>
            <p className="v" style={{ fontSize: "1.2rem" }}>
              {formatPHP(monthlyTotals.get(m) ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>
          Parking Details{" "}
          <span className="hint">{rows.length} entries</span>
        </h2>
        {rows.length === 0 ? (
          <p style={{ color: "var(--text-3)", padding: "1rem 0" }}>
            No bookings with parking fees found.
          </p>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date Range</th>
                  <th>Unit</th>
                  <th>Guest</th>
                  <th>Parking Slot</th>
                  <th>Fee Type</th>
                  <th className="tar">Nights</th>
                  <th className="tar">Amount</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => {
                  const monthRows = rows.filter((r) => r.month === month);
                  return (
                    <Fragment key={month}>
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            background: "var(--bg-2)",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {formatMonth(month)}
                        </td>
                      </tr>
                      {monthRows.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {r.checkIn} → {r.checkOut}
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: "var(--mono)",
                                fontWeight: 700,
                              }}
                            >
                              {r.unitCode}
                            </span>
                            {r.unitName && (
                              <span
                                style={{
                                  color: "var(--text-3)",
                                  marginLeft: "0.4rem",
                                }}
                              >
                                {r.unitName}
                              </span>
                            )}
                          </td>
                          <td>{r.guest}</td>
                          <td
                            style={{
                              fontFamily: "var(--mono)",
                              fontWeight: 600,
                            }}
                          >
                            {r.slot}
                          </td>
                          <td>{r.feeType}</td>
                          <td className="tar mono">{r.nights}</td>
                          <td className="tar mono" style={{ fontWeight: 700 }}>
                            {formatPHP(r.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr
                        style={{
                          borderTop: "2px solid var(--line)",
                          fontWeight: 700,
                        }}
                      >
                        <td colSpan={6} className="tar">
                          {formatMonth(month)} Total
                        </td>
                        <td className="tar mono">
                          {formatPHP(monthlyTotals.get(month) ?? 0)}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    fontWeight: 700,
                    borderTop: "3px solid var(--line)",
                    fontSize: "1.05rem",
                  }}
                >
                  <td colSpan={6} className="tar">
                    Grand Total
                  </td>
                  <td className="tar mono">{formatPHP(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p style={{ marginTop: "1rem" }}>
        <Link href="/admin/reports" style={{ color: "var(--accent)" }}>
          ← Back to Reports
        </Link>
      </p>
    </>
  );
}
