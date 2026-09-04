import Link from "next/link";
import { UNITS } from "../../../src/data/units.ts";
import { getBookings } from "../../../src/data/db.ts";
import { nightsBetween, toDateStr } from "../../../src/lib/dates.ts";
import { formatPHP, quote } from "../../../src/lib/pricing.ts";
import { ConfirmBtn } from "./_confirm-btn.tsx";
import { DeleteBtn } from "./_delete-btn.tsx";
import { StatusBtn } from "./_status-btn.tsx";
import { ParkingSlot } from "./_parking-slot.tsx";
import { InlineEdit, InlineSelect } from "./_inline-edit.tsx";
import { BookingAmounts } from "./_booking-amounts.tsx";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  "booking.com": "Booking.com",
  agoda: "Agoda",
  facebook: "Facebook",
  manual: "Manual",
  block: "Blocked",
};

const SOURCE_OPTIONS = [
  { value: "direct", label: "Direct" },
  { value: "airbnb", label: "Airbnb" },
  { value: "booking.com", label: "Booking.com" },
  { value: "agoda", label: "Agoda" },
  { value: "facebook", label: "Facebook" },
  { value: "manual", label: "Manual" },
  { value: "block", label: "Blocked" },
];

const SOURCE_COLORS: Record<string, string> = {
  direct: "#2980b9",
  airbnb: "#ff5a5f",
  "booking.com": "#003580",
  agoda: "#5542f6",
  facebook: "#4267B2",
  manual: "#7f8c8d",
  block: "#e74c3c",
};

const GONE = new Set(["checked_out", "cancelled", "payment_rejected", "expired", "no_show", "blocked"]);

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { bookings } = await getBookings();

  const filterSource = sp.source || "";
  const filterUnit = sp.unit || "";
  const search = (sp.q || "").toLowerCase();
  const showAll = sp.show === "all";
  const sortBy = sp.sort || "checkin";
  const sortDir = sp.dir === "desc" ? "desc" : "asc";

  let filtered = bookings;
  if (!showAll) {
    filtered = filtered.filter((b) => !GONE.has(b.status));
  }
  if (filterSource) {
    filtered = filtered.filter((b) => b.source === filterSource);
  }
  if (filterUnit) {
    filtered = filtered.filter((b) => b.unitId === filterUnit);
  }
  if (search) {
    filtered = filtered.filter(
      (b) =>
        b.guest.toLowerCase().includes(search) ||
        b.unitId.toLowerCase().includes(search),
    );
  }

  const today = toDateStr(new Date());

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "checkin" && sortDir === "asc") {
      const aIsToday = a.checkIn <= today && a.checkOut > today ? 0 : a.checkIn > today ? 1 : 2;
      const bIsToday = b.checkIn <= today && b.checkOut > today ? 0 : b.checkIn > today ? 1 : 2;
      if (aIsToday !== bIsToday) return aIsToday - bIsToday;
      if (aIsToday === 2) return b.checkIn.localeCompare(a.checkIn);
      return a.checkIn.localeCompare(b.checkIn);
    }
    let cmp = 0;
    switch (sortBy) {
      case "unit": cmp = a.unitId.localeCompare(b.unitId); break;
      case "guest": cmp = (a.guest || "").localeCompare(b.guest || ""); break;
      case "checkout": cmp = a.checkOut.localeCompare(b.checkOut); break;
      case "amount": cmp = (a.grossAmount || 0) - (b.grossAmount || 0); break;
      case "status": cmp = a.status.localeCompare(b.status); break;
      case "source": cmp = (a.source || "").localeCompare(b.source || ""); break;
      default: cmp = a.checkIn.localeCompare(b.checkIn); break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  function sortUrl(col: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterSource) params.set("source", filterSource);
    if (filterUnit) params.set("unit", filterUnit);
    if (showAll) params.set("show", "all");
    params.set("sort", col);
    params.set("dir", sortBy === col && sortDir === "asc" ? "desc" : "asc");
    return `/admin/bookings?${params.toString()}`;
  }

  function sortLabel(col: string) {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const sources = [...new Set(bookings.map((b) => b.source).filter(Boolean))];
  const unitIds = [...new Set(bookings.map((b) => b.unitId))].sort();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Bookings</h1>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.8rem" }}>
            <Link href="/admin/bookings" style={{ fontWeight: showAll ? 400 : 700, color: "var(--accent)", textDecoration: "none" }}>
              Active
            </Link>
            <Link href="/admin/bookings/history" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              History
            </Link>
            <Link href="/admin/bookings?show=all" style={{ fontWeight: showAll ? 700 : 400, color: "var(--text-3)", textDecoration: "none" }}>
              All
            </Link>
          </div>
        </div>
        <Link href="/admin/bookings/new" className="btn">
          + New Booking
        </Link>
      </div>

      <div className="panel">
        <form className="filter-bar" method="get">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input
              type="text"
              id="q"
              name="q"
              placeholder="Guest name..."
              defaultValue={search}
            />
          </div>
          <div className="field">
            <label htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue={filterSource}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s!}>
                  {SOURCE_LABEL[s!] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select id="unit" name="unit" defaultValue={filterUnit}>
              <option value="">All units</option>
              {unitIds.map((id) => {
                const u = unitMap.get(id);
                return (
                  <option key={id} value={id}>
                    {u ? `${u.tower}-${u.code}` : id}
                  </option>
                );
              })}
            </select>
          </div>
          <button className="btn" type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>
          {sorted.length} bookings{" "}
          <span className="hint">all fields are editable — click to change</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th><Link href={sortUrl("unit")} style={{ color: "inherit", textDecoration: "none" }}>Unit{sortLabel("unit")}</Link></th>
                <th>Parking</th>
                <th><Link href={sortUrl("guest")} style={{ color: "inherit", textDecoration: "none" }}>Guest{sortLabel("guest")}</Link></th>
                <th><Link href={sortUrl("checkin")} style={{ color: "inherit", textDecoration: "none" }}>Check-in{sortLabel("checkin")}</Link></th>
                <th><Link href={sortUrl("checkout")} style={{ color: "inherit", textDecoration: "none" }}>Check-out{sortLabel("checkout")}</Link></th>
                <th>Nights</th>
                <th>Pax</th>
                <th><Link href={sortUrl("source")} style={{ color: "inherit", textDecoration: "none" }}>Source{sortLabel("source")}</Link></th>
                <th className="tar">Unit Amt</th>
                <th className="tar">Parking</th>
                <th className="tar"><Link href={sortUrl("amount")} style={{ color: "inherit", textDecoration: "none" }}>Total{sortLabel("amount")}</Link></th>
                <th>Balance</th>
                <th>Proof</th>
                <th>Notes</th>
                <th><Link href={sortUrl("status")} style={{ color: "inherit", textDecoration: "none" }}>Status{sortLabel("status")}</Link></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const unit = unitMap.get(b.unitId);
                let nights = 0;
                try {
                  nights = nightsBetween(b.checkIn, b.checkOut);
                } catch {
                  /* skip */
                }
                let amount = "";
                if (unit && nights > 0 && nights < 28) {
                  try {
                    const p = quote(unit, b.checkIn, b.checkOut, b.guests || 2);
                    amount = formatPHP(p.total);
                  } catch {
                    /* skip */
                  }
                }
                return (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {unit
                        ? `${unit.tower}-${unit.code}${unit.buildingId === "east" ? " E" : ""}`
                        : b.unitId}
                    </td>
                    <td className="mono">
                      <ParkingSlot bookingId={b.id} value={b.parkingSlot} />
                    </td>
                    <td>
                      <InlineEdit bookingId={b.id} field="guestName" value={b.guest || ""} placeholder="Guest name" width="8rem" />
                    </td>
                    <td>
                      <InlineEdit bookingId={b.id} field="checkIn" value={b.checkIn} type="date" mono />
                    </td>
                    <td>
                      <InlineEdit bookingId={b.id} field="checkOut" value={b.checkOut} type="date" mono />
                    </td>
                    <td className="tar mono">{nights}</td>
                    <td className="tar">
                      <InlineEdit bookingId={b.id} field="guests" value={String(b.guests || 2)} type="number" width="2.5rem" />
                    </td>
                    <td>
                      <InlineSelect
                        bookingId={b.id}
                        field="source"
                        value={b.source ?? "direct"}
                        options={SOURCE_OPTIONS}
                        colorMap={SOURCE_COLORS}
                      />
                    </td>
                    <BookingAmounts
                      bookingId={b.id}
                      grossAmount={b.grossAmount}
                      parkingFee={b.parkingFee}
                      parkingFeeType={b.parkingFeeType}
                      nights={nights}
                    />
                    <td>
                      {(() => {
                        const bal = b.grossAmount - b.amountPaid;
                        if (b.grossAmount <= 0) return <span style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>—</span>;
                        if (bal <= 0) return (
                          <span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#fff", background: "var(--good)", padding: "0.15rem 0.5rem", borderRadius: "9px", whiteSpace: "nowrap", display: "inline-block" }}>Fully Paid</span>
                            {b.collectedBy && <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-3)", marginTop: "0.15rem" }}>by {b.collectedBy}</span>}
                          </span>
                        );
                        return (
                          <span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#fff", background: "var(--crit, #c0392b)", padding: "0.15rem 0.5rem", borderRadius: "9px", whiteSpace: "nowrap", display: "inline-block" }}>Collect {formatPHP(bal)}</span>
                            {b.collectedBy && <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-3)", marginTop: "0.15rem" }}>partial by {b.collectedBy}</span>}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      {b.proofPath ? (
                        <span style={{ color: "var(--good)", fontWeight: 600, fontSize: "0.75rem" }}>Uploaded</span>
                      ) : (
                        <span style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>None</span>
                      )}
                    </td>
                    <td>
                      <InlineEdit bookingId={b.id} field="notes" value={b.notes || ""} placeholder="Add notes..." width="8rem" />
                    </td>
                    <td><ConfirmBtn bookingId={b.id} status={b.status} /></td>
                    <td style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {b.status === "confirmed" && b.checkIn <= today && b.checkOut > today && (
                        <StatusBtn
                          bookingId={b.id}
                          action="checked_in"
                          label="Check In"
                          confirmMsg={`Check in ${b.guest || "this guest"}?`}
                        />
                      )}
                      {(b.status === "checked_in" || (b.status === "confirmed" && b.checkOut <= today)) && (
                        <StatusBtn
                          bookingId={b.id}
                          action="checked_out"
                          label="Check Out"
                          confirmMsg={`Check out ${b.guest || "this guest"}?`}
                        />
                      )}
                      <Link
                        href={`/admin/bookings/${b.id}/edit`}
                        style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                      >
                        Edit
                      </Link>
                      <DeleteBtn bookingId={b.id} guest={b.guest} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
