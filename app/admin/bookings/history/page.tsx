import Link from "next/link";
import { UNITS } from "../../../../src/data/units.ts";
import { getBookings } from "../../../../src/data/db.ts";
import { nightsBetween } from "../../../../src/lib/dates.ts";
import { formatPHP, quote } from "../../../../src/lib/pricing.ts";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  payment_rejected: "Payment Rejected",
  expired: "Expired",
  no_show: "No Show",
};

export default async function HistoryPage() {
  const { bookings } = await getBookings();
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const past = bookings.filter(
    (b) =>
      b.status === "checked_out" ||
      b.status === "cancelled" ||
      b.status === "payment_rejected" ||
      b.status === "expired" ||
      b.status === "no_show",
  ).sort((a, b) => b.checkOut.localeCompare(a.checkOut));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Booking History</h1>
          <p className="dash-date">
            {past.length} past bookings
          </p>
        </div>
        <Link href="/admin" className="btn-outline" style={{ fontSize: "0.8rem" }}>
          Back to Dashboard
        </Link>
      </div>

      <div className="panel">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Guest</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Source</th>
                <th className="tar">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {past.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem" }}>
                    No past bookings yet
                  </td>
                </tr>
              ) : (
                past.map((b) => {
                  const unit = unitMap.get(b.unitId);
                  let nights = 0;
                  try {
                    nights = nightsBetween(b.checkIn, b.checkOut);
                  } catch { /* skip */ }
                  let amount = "";
                  if (unit && nights > 0 && nights < 28) {
                    try {
                      const p = quote(unit, b.checkIn, b.checkOut, b.guests || 2);
                      amount = formatPHP(p.total);
                    } catch { /* skip */ }
                  }
                  const statusColor = b.status === "checked_out" ? "var(--good)" : "var(--text-3)";
                  return (
                    <tr key={b.id}>
                      <td className="mono">
                        {unit
                          ? `${unit.tower}-${unit.code}${unit.buildingId === "east" ? " E" : ""}`
                          : b.unitId}
                      </td>
                      <td>{b.guest || "—"}</td>
                      <td className="mono">{b.checkIn}</td>
                      <td className="mono">{b.checkOut}</td>
                      <td className="tar mono">{nights}</td>
                      <td>
                        <span className={`src-pill ${b.source ?? "unknown"}`}>
                          {b.source ?? "—"}
                        </span>
                      </td>
                      <td className="tar mono">{amount || "—"}</td>
                      <td>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: statusColor }}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
