import { UNITS } from "../../../src/data/units.ts";
import { getBookings } from "../../../src/data/db.ts";
import { InvoiceActions } from "./_actions.tsx";
import { PermGuard } from "../_perm-guard.tsx";

export const dynamic = "force-dynamic";

function getUnitLabel(unitId: string): string {
  const u = UNITS.find((u) => u.id === unitId);
  return u ? (u.name || `${u.tower}-${u.code}`) : unitId;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPHP(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  payment_rejected: "Rejected",
  expired: "Expired",
  no_show: "No Show",
};

export default async function InvoicesPage() {
  const { bookings } = await getBookings();
  const valid = bookings
    .filter((b) => b.status !== "blocked" && b.source !== "block")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <PermGuard perm="payments.view">
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Invoices</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            View, download, and send invoices to guests.
          </p>
        </div>
      </div>

      <div className="panel">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Guest</th>
                <th>Unit</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {valid.map((b) => {
                const balance = b.grossAmount - (b.amountPaid || 0) - (b.discountAmount || 0);
                return (
                  <tr key={b.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
                      INV-{b.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td>
                      <strong>{b.guest}</strong>
                      <br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                        {b.guestEmail}
                      </span>
                    </td>
                    <td>{getUnitLabel(b.unitId)}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      {formatDate(b.checkIn)}<br />
                      {formatDate(b.checkOut)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatPHP(b.grossAmount)}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--good)" }}>
                      {formatPHP(b.amountPaid || 0)}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: balance > 0 ? "var(--crit)" : "var(--good)" }}>
                      {balance > 0 ? formatPHP(balance) : "Paid"}
                    </td>
                    <td>
                      <span className={`src-pill ${b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out" ? "manual" : b.status === "cancelled" ? "block" : ""}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                    <td>
                      <InvoiceActions bookingId={b.id} guestEmail={b.guestEmail} />
                    </td>
                  </tr>
                );
              })}
              {valid.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
    </PermGuard>
  );
}
