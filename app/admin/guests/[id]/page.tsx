import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuest } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";
import { nightsBetween } from "../../../../src/lib/dates.ts";
import { NotesForm } from "./_notes-form.tsx";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  agoda: "Agoda",
  facebook: "Facebook",
  manual: "Manual",
};

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guest = await getGuest(id);
  if (!guest) notFound();

  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const totalNights = guest.bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => {
      try {
        return sum + nightsBetween(b.checkIn, b.checkOut);
      } catch {
        return sum;
      }
    }, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <Link
            href="/admin/guests"
            style={{ fontSize: "0.82rem", color: "var(--text-3)", textDecoration: "none" }}
          >
            Guest CRM
          </Link>
          <h1 className="today">{guest.name}</h1>
        </div>
      </div>

      <div className="crm-profile">
        <div className="crm-profile-main">
          <div className="crm-avatar">
            {guest.name.charAt(0).toUpperCase()}
          </div>
          <div className="crm-profile-info">
            <h2>{guest.name}</h2>
            <div className="crm-contact-list">
              {guest.email && (
                <a href={`mailto:${guest.email}`} className="crm-contact-item">
                  {guest.email}
                </a>
              )}
              {guest.phone && (
                <a href={`tel:${guest.phone}`} className="crm-contact-item">
                  {guest.phone}
                </a>
              )}
              {!guest.email && !guest.phone && (
                <span className="crm-contact-item" style={{ color: "var(--text-3)" }}>
                  No contact info on file
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
              Guest since {new Date(guest.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        <div className="crm-stats" style={{ marginTop: "1rem" }}>
          <div className="crm-stat-card">
            <span className="crm-stat-value">{guest.totalBookings}</span>
            <span className="crm-stat-label">Bookings</span>
          </div>
          <div className="crm-stat-card">
            <span className="crm-stat-value">{totalNights}</span>
            <span className="crm-stat-label">Total Nights</span>
          </div>
          <div className="crm-stat-card">
            <span className="crm-stat-value">{formatPHP(guest.totalRevenue)}</span>
            <span className="crm-stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <NotesForm guestId={guest.id} initial={guest.notes ?? ""} />
      </div>

      <div className="panel">
        <h2>
          Booking History{" "}
          <span className="hint">{guest.bookings.length} booking{guest.bookings.length !== 1 ? "s" : ""}</span>
        </h2>
        {guest.bookings.length === 0 ? (
          <p style={{ color: "var(--text-3)", padding: "1rem 0" }}>No bookings yet.</p>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th className="tar">Nights</th>
                  <th>Source</th>
                  <th className="tar">Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guest.bookings.map((b) => {
                  const unit = unitMap.get(b.unitId);
                  let nights = 0;
                  try {
                    nights = nightsBetween(b.checkIn, b.checkOut);
                  } catch {
                    /* skip */
                  }
                  return (
                    <tr key={b.id}>
                      <td className="mono">
                        {unit ? `${unit.tower}-${unit.code}` : b.unitId}
                      </td>
                      <td className="mono">{b.checkIn}</td>
                      <td className="mono">{b.checkOut}</td>
                      <td className="tar mono">{nights}</td>
                      <td>
                        <span className={`src-pill ${b.source ?? "unknown"}`}>
                          {SOURCE_LABEL[b.source ?? ""] ?? b.source ?? "—"}
                        </span>
                      </td>
                      <td className="tar mono">
                        {b.grossAmount > 0 ? formatPHP(b.grossAmount) : "—"}
                      </td>
                      <td>
                        <span
                          className="crm-badge"
                          style={{
                            background:
                              b.status === "confirmed" || b.status === "checked_out"
                                ? "rgba(59,122,46,0.12)"
                                : b.status === "cancelled"
                                  ? "rgba(164,64,44,0.12)"
                                  : "rgba(166,124,36,0.12)",
                            color:
                              b.status === "confirmed" || b.status === "checked_out"
                                ? "var(--good)"
                                : b.status === "cancelled"
                                  ? "var(--crit)"
                                  : "var(--warn)",
                          }}
                        >
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/bookings/${b.id}/edit`}
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--accent)",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
