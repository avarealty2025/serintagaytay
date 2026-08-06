"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UNITS } from "../../../../../src/data/units.ts";
import { formatPHP } from "../../../../../src/lib/pricing.ts";

const DOW_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface RateOverride {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  rate: number;
  minStay: number | null;
  label: string | null;
}

interface Booking {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  guest: string;
  source: string | null;
  status: string;
}

const SOURCE_COLORS: Record<string, string> = {
  direct: "#2F5A1E",
  airbnb: "#FF5A5F",
  agoda: "#5542F6",
  facebook: "#1877F2",
};

function pad2(n: number) { return n.toString().padStart(2, "0"); }
function toDateStr(d: Date) { return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }
function dateInRange(date: string, start: string, end: string) { return date >= start && date < end; }

export default function UnitCalendarPage() {
  const params = useParams();
  const sp = useSearchParams();
  const unitId = params.id as string;
  const unit = UNITS.find((u) => u.id === unitId);

  const today = new Date();
  const todayStr = toDateStr(today);
  const year = Number(sp.get("year")) || today.getUTCFullYear();
  const month = Number(sp.get("month")) || today.getUTCMonth() + 1;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<RateOverride[]>([]);
  const [unitUuid, setUnitUuid] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideRate, setOverrideRate] = useState("");
  const [overrideLabel, setOverrideLabel] = useState("");
  const [overrideMinStay, setOverrideMinStay] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const monthStart = `${year}-${pad2(month)}-01`;
  const monthEnd = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;

  const loadData = useCallback(async () => {
    const [bookRes, unitRes] = await Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch(`/api/units/${unitId}`).then((r) => r.json()),
    ]);

    if (bookRes.bookings) {
      setBookings(bookRes.bookings.filter(
        (b: Booking) =>
          b.unitId === unitId &&
          b.checkIn < monthEnd &&
          b.checkOut > monthStart &&
          b.status !== "cancelled" &&
          b.status !== "payment_rejected" &&
          b.status !== "expired",
      ));
    }

    if (unitRes.supabaseId) {
      setUnitUuid(unitRes.supabaseId);
      const ovRes = await fetch(`/api/rate-overrides?unitId=${unitRes.supabaseId}`).then((r) => r.json());
      if (ovRes.overrides) setOverrides(ovRes.overrides);
    }
  }, [unitId, monthStart, monthEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  function getOverrideForDate(dateStr: string): RateOverride | undefined {
    return overrides.find((o) => dateInRange(dateStr, o.startDate, o.endDate));
  }

  function getRateForDate(dateStr: string): { rate: number; basis: string } {
    const ov = getOverrideForDate(dateStr);
    if (ov) return { rate: ov.rate, basis: "override" };
    const d = new Date(dateStr + "T00:00:00Z");
    const dow = d.getUTCDay();
    const isWeekend = dow === 5 || dow === 6;
    return {
      rate: isWeekend ? (unit?.weekendRate ?? 0) : (unit?.baseRate ?? 0),
      basis: isWeekend ? "weekend" : "weekday",
    };
  }

  function toggleDate(dateStr: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function selectRange(start: number, end: number) {
    const dates = new Set<string>();
    for (let d = start; d <= end; d++) {
      dates.add(`${year}-${pad2(month)}-${pad2(d)}`);
    }
    setSelectedDates(dates);
  }

  async function handleSaveOverride() {
    if (!unitUuid || !overrideRate || selectedDates.size === 0) return;
    setSaving(true);
    setError("");

    const sorted = [...selectedDates].sort();
    const startDate = sorted[0];
    const lastDate = sorted[sorted.length - 1];
    const d = new Date(lastDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    const endDate = toDateStr(d);

    try {
      const res = await fetch("/api/rate-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unitUuid,
          startDate,
          endDate,
          rate: Number(overrideRate),
          minStay: overrideMinStay ? Number(overrideMinStay) : null,
          label: overrideLabel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to save");
        return;
      }
      setSelectedDates(new Set());
      setShowOverrideForm(false);
      setOverrideRate("");
      setOverrideLabel("");
      setOverrideMinStay("");
      await loadData();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOverride(id: string) {
    if (!confirm("Remove this rate override?")) return;
    await fetch(`/api/rate-overrides/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function handleCopyIcal() {
    const url = `https://tagaytaystaycation.com/api/ical/${unitId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!unit) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        <p>Unit not found.</p>
        <Link href="/admin/units" className="btn">Back to Units</Link>
      </div>
    );
  }

  const calCells = [];
  for (let i = 0; i < firstDow; i++) calCells.push({ day: 0 });
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d });
  while (calCells.length % 7 !== 0) calCells.push({ day: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/admin/units/${unitId}`} className="back-link">
            &larr; {unit.tower}-{unit.code} {unit.buildingId === "west" ? "West" : "East"}
          </Link>
          <h1 className="today">
            {unit.name || `${unit.tower}-${unit.code}`} — Calendar &amp; Pricing
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={selectedDates.size > 0 ? "btn" : "btn btn-outline"}
            onClick={() => {
              if (selectedDates.size > 0) {
                setShowOverrideForm(true);
              }
            }}
            disabled={selectedDates.size === 0}
          >
            Set Price ({selectedDates.size} day{selectedDates.size !== 1 ? "s" : ""})
          </button>
        </div>
      </div>

      {/* iCal Export Section */}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700 }}>Export Calendar (iCal)</h3>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-3)" }}>
              Copy this URL and paste it into Airbnb, Agoda, Booking.com, or Google Calendar to sync availability.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={`https://tagaytaystaycation.com/api/ical/${unitId}`}
              style={{ width: "320px", fontFamily: "var(--mono)", fontSize: "0.72rem", padding: "0.4rem 0.6rem" }}
            />
            <button className="btn btn-sm" onClick={handleCopyIcal}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={`/api/ical/${unitId}`}
              className="btn-outline btn-sm"
              target="_blank"
              rel="noopener"
              style={{ textDecoration: "none", padding: "0.35rem 0.75rem", fontSize: "0.78rem", border: "1px solid var(--line)", borderRadius: "6px" }}
            >
              Download .ics
            </a>
          </div>
        </div>
      </div>

      {/* Override Form Modal */}
      {showOverrideForm && (
        <div className="panel" style={{ marginBottom: "1rem", borderLeft: "3px solid var(--accent)" }}>
          <h2>Set Custom Price</h2>
          <div className="form-body">
            <p style={{ fontSize: "0.82rem", color: "var(--text-2)", margin: "0 0 0.75rem" }}>
              Setting price for <strong>{selectedDates.size}</strong> selected day{selectedDates.size !== 1 ? "s" : ""}:
              {" "}{[...selectedDates].sort()[0]} to {[...selectedDates].sort().pop()}
            </p>
            {error && (
              <div style={{ padding: "0.5rem 0.75rem", background: "color-mix(in srgb, var(--crit) 10%, transparent)", borderRadius: "6px", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--crit)" }}>{error}</p>
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label htmlFor="overrideRate">Nightly Rate (PHP) *</label>
                <input
                  type="number"
                  id="overrideRate"
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(e.target.value)}
                  min={0}
                  step={100}
                  placeholder={String(unit.baseRate)}
                />
              </div>
              <div className="field">
                <label htmlFor="overrideLabel">Label</label>
                <input
                  type="text"
                  id="overrideLabel"
                  value={overrideLabel}
                  onChange={(e) => setOverrideLabel(e.target.value)}
                  placeholder="e.g. Holy Week, Peak Season"
                />
              </div>
              <div className="field">
                <label htmlFor="overrideMinStay">Min Stay</label>
                <input
                  type="number"
                  id="overrideMinStay"
                  value={overrideMinStay}
                  onChange={(e) => setOverrideMinStay(e.target.value)}
                  min={1}
                  placeholder={String(unit.minStay)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn" onClick={handleSaveOverride} disabled={saving || !overrideRate}>
                {saving ? "Saving..." : "Save Rate Override"}
              </button>
              <button className="btn btn-outline" onClick={() => { setShowOverrideForm(false); setError(""); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
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

        <div style={{ padding: "0.5rem 1rem 0", fontSize: "0.75rem", color: "var(--text-3)" }}>
          Click days to select, then &ldquo;Set Price&rdquo; to create a rate override. Click a booking bar to edit.
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid var(--line)",
          marginTop: "0.5rem",
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
            if (cell.day === 0) {
              return (
                <div key={i} style={{
                  minHeight: "5.5rem",
                  borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--line)" : "none",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--surface-2, #f8f8f6)",
                }} />
              );
            }

            const dateStr = `${year}-${pad2(month)}-${pad2(cell.day)}`;
            const isToday = dateStr === todayStr;
            const isWeekend = i % 7 === 0 || i % 7 === 6;
            const isSelected = selectedDates.has(dateStr);
            const { rate, basis } = getRateForDate(dateStr);
            const dayBookings = bookings.filter((b) => dateInRange(dateStr, b.checkIn, b.checkOut));
            const hasBooking = dayBookings.length > 0;

            return (
              <div
                key={i}
                onClick={() => toggleDate(dateStr)}
                style={{
                  minHeight: "5.5rem",
                  padding: "0.35rem",
                  borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--line)" : "none",
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  userSelect: "none",
                  background: isSelected
                    ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                    : isToday
                      ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                      : isWeekend
                        ? "color-mix(in srgb, var(--surface-2, #f8f8f6) 50%, transparent)"
                        : "transparent",
                  outline: isSelected ? "2px solid var(--accent)" : "none",
                  outlineOffset: "-2px",
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.15rem",
                }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "var(--accent)" : "var(--text-2)",
                  }}>
                    {cell.day}
                  </span>
                  <span style={{
                    fontSize: "0.65rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: basis === "override" ? "var(--accent)" : basis === "weekend" ? "var(--warn, #C89F45)" : "var(--text-3)",
                  }}>
                    {formatPHP(rate)}
                  </span>
                </div>
                {basis === "override" && (
                  <div style={{
                    fontSize: "0.58rem",
                    color: "var(--accent)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.1rem",
                  }}>
                    {getOverrideForDate(dateStr)?.label || "Custom"}
                  </div>
                )}
                {dayBookings.map((b) => {
                  const isCheckIn = b.checkIn === dateStr;
                  const srcColor = SOURCE_COLORS[b.source ?? ""] || "#888";
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/bookings/${b.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "block",
                        fontSize: "0.6rem",
                        lineHeight: 1.3,
                        padding: "0.12rem 0.25rem",
                        marginBottom: "0.1rem",
                        borderRadius: "3px",
                        background: srcColor,
                        color: "#fff",
                        textDecoration: "none",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        borderLeft: isCheckIn ? "3px solid #fff" : "none",
                      }}
                      title={`${b.guest} · ${b.checkIn} → ${b.checkOut}`}
                    >
                      {isCheckIn ? "→ " : ""}{b.guest || "Guest"}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Rate Overrides */}
      {overrides.length > 0 && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>
            Active Rate Overrides{" "}
            <span className="hint">{overrides.length} total</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Rate</th>
                  <th>Min Stay</th>
                  <th>Label</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {overrides
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map((o) => (
                    <tr key={o.id}>
                      <td className="mono">{o.startDate}</td>
                      <td className="mono">{o.endDate}</td>
                      <td className="mono" style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {formatPHP(o.rate)}
                      </td>
                      <td className="tar">{o.minStay ?? "—"}</td>
                      <td>{o.label || "—"}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteOverride(o.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--crit)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings this month */}
      {bookings.length > 0 && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>
            Bookings this month{" "}
            <span className="hint">{bookings.length} total</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
                  .map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.guest || "—"}</td>
                      <td className="mono">{b.checkIn}</td>
                      <td className="mono">{b.checkOut}</td>
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
    </>
  );
}
