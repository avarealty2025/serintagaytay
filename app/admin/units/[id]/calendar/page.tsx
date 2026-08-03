import Link from "next/link";
import { UNITS } from "../../../../../src/data/units.ts";
import { getBookings } from "../../../../../src/data/db.ts";
import { toDateStr, dateInRange } from "../../../../../src/lib/dates.ts";

export const dynamic = "force-dynamic";

const DOW_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SOURCE_COLORS: Record<string, string> = {
  direct: "#2F5A1E",
  airbnb: "#FF5A5F",
  agoda: "#5542F6",
  facebook: "#1877F2",
};

function pad2(n: number) { return n.toString().padStart(2, "0"); }

export default async function UnitCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id: unitId } = await params;
  const sp = await searchParams;
  const unit = UNITS.find((u) => u.id === unitId);

  if (!unit) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        <p>Unit not found.</p>
        <Link href="/admin/units" className="btn">Back to Units</Link>
      </div>
    );
  }

  const today = new Date();
  const todayStr = toDateStr(today);
  const year = Number(sp.year) || today.getUTCFullYear();
  const month = Number(sp.month) || today.getUTCMonth() + 1;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startDow = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const monthStart = `${year}-${pad2(month)}-01`;
  const monthEnd = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;

  const { bookings } = await getBookings();
  const unitBookings = bookings.filter(
    (b) =>
      b.unitId === unitId &&
      b.checkIn < monthEnd &&
      b.checkOut > monthStart &&
      b.status !== "cancelled" &&
      b.status !== "payment_rejected" &&
      b.status !== "expired",
  );

  const dayMap = new Map<number, typeof unitBookings>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    const dayBookings = unitBookings.filter(
      (b) => dateInRange(dateStr, b.checkIn, b.checkOut),
    );
    if (dayBookings.length > 0) {
      dayMap.set(d, dayBookings);
    }
  }

  const calCells = [];
  for (let i = 0; i < startDow; i++) {
    calCells.push({ day: 0, bookings: [] as typeof unitBookings });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push({ day: d, bookings: dayMap.get(d) || [] });
  }
  while (calCells.length % 7 !== 0) {
    calCells.push({ day: 0, bookings: [] as typeof unitBookings });
  }

  const icalExportUrl = `/api/ical/${unitId}`;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/admin/units/${unitId}`} className="back-link">
            &larr; {unit.tower}-{unit.code} {unit.buildingId === "west" ? "West" : "East"}
          </Link>
          <h1 className="today">
            {unit.name || `${unit.tower}-${unit.code}`} — Calendar
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={icalExportUrl}
            className="btn-outline btn-sm"
            target="_blank"
            rel="noopener"
            title="Download .ics file to import into Airbnb, Agoda, Google Calendar, etc."
          >
            Export iCal
          </a>
        </div>
      </div>

      <div className="panel">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--line)",
        }}>
          <Link
            href={`/admin/units/${unitId}/calendar?year=${prevYear}&month=${prevMonth}`}
            style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: "0.85rem" }}
          >
            &larr; {MONTH_NAMES[prevMonth - 1]}
          </Link>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Link
            href={`/admin/units/${unitId}/calendar?year=${nextYear}&month=${nextMonth}`}
            style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: "0.85rem" }}
          >
            {MONTH_NAMES[nextMonth - 1]} &rarr;
          </Link>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}>
          {DOW_HEADERS.map((d) => (
            <div key={d} style={{
              padding: "0.5rem",
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-3)",
              background: "var(--surface-2, #f8f8f6)",
            }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
        }}>
          {calCells.map((cell, i) => {
            const isToday =
              cell.day > 0 &&
              `${year}-${pad2(month)}-${pad2(cell.day)}` === todayStr;
            const hasBooking = cell.bookings.length > 0;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={i}
                style={{
                  minHeight: "5.5rem",
                  padding: "0.35rem",
                  borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--line)" : "none",
                  borderBottom: "1px solid var(--line)",
                  background: cell.day === 0
                    ? "var(--surface-2, #f8f8f6)"
                    : isToday
                      ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                      : isWeekend
                        ? "color-mix(in srgb, var(--surface-2, #f8f8f6) 50%, transparent)"
                        : "transparent",
                }}
              >
                {cell.day > 0 && (
                  <>
                    <div style={{
                      fontSize: "0.75rem",
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? "var(--accent)" : "var(--text-2)",
                      marginBottom: "0.2rem",
                    }}>
                      {cell.day}
                    </div>
                    {cell.bookings.map((b) => {
                      const isCheckIn = b.checkIn === `${year}-${pad2(month)}-${pad2(cell.day)}`;
                      const srcColor = SOURCE_COLORS[b.source ?? ""] || "#888";
                      return (
                        <Link
                          key={b.id}
                          href={`/admin/bookings/${b.id}/edit`}
                          style={{
                            display: "block",
                            fontSize: "0.65rem",
                            lineHeight: 1.3,
                            padding: "0.15rem 0.3rem",
                            marginBottom: "0.15rem",
                            borderRadius: "3px",
                            background: srcColor,
                            color: "#fff",
                            textDecoration: "none",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            borderLeft: isCheckIn ? "3px solid #fff" : "none",
                          }}
                          title={`${b.guest} · ${b.checkIn} → ${b.checkOut} · ${b.source} · ${b.status}`}
                        >
                          {isCheckIn ? "→ " : ""}{b.guest || "Guest"}
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {unitBookings.length > 0 && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>
            Bookings this month{" "}
            <span className="hint">{unitBookings.length} total</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Pax</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {unitBookings
                  .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
                  .map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.guest || "—"}</td>
                      <td className="mono">{b.checkIn}</td>
                      <td className="mono">{b.checkOut}</td>
                      <td className="tar">{b.guests || "—"}</td>
                      <td>
                        <span className={`src-pill ${b.source ?? "unknown"}`}>
                          {b.source ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${b.status === "confirmed" ? "free" : ""}`} style={{ fontSize: "0.68rem" }}>
                          {b.status}
                        </span>
                      </td>
                      <td className="tar mono">
                        {b.grossAmount > 0 ? `₱${b.grossAmount.toLocaleString()}` : "—"}
                      </td>
                      <td>
                        <Link
                          href={`/admin/bookings/${b.id}/edit`}
                          style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>Calendar Sync</h2>
        <div className="form-body" style={{ padding: "1rem" }}>
          <div className="field">
            <label>iCal Export URL (share with Airbnb, Agoda, Booking.com)</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                readOnly
                defaultValue={`https://tagaytaystaycation.com/api/ical/${unitId}`}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
              Copy this URL and paste it as an &ldquo;Import Calendar&rdquo; link in Airbnb, Agoda, or Booking.com to sync your availability.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
