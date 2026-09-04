"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CalendarBooking {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  guest: string;
  source: string | null;
  status: string;
  notes: string | null;
}

interface CalendarUnit {
  id: string;
  tower: number;
  code: string;
  buildingId: string;
  name?: string;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeek(d: string): number {
  const parts = d.split("-").map(Number);
  return new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!)).getUTCDay();
}

function nightsBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

function addDays(d: string, n: number): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function InteractiveCalendar({
  units,
  bookings: initialBookings,
  days,
  start,
  today,
  windowSize,
}: {
  units: CalendarUnit[];
  bookings: CalendarBooking[];
  days: string[];
  start: string;
  today: string;
  windowSize: number;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [popup, setPopup] = useState<{
    type: "block" | "bar";
    unitId: string;
    unitLabel: string;
    date?: string;
    booking?: CalendarBooking;
    x: number;
    y: number;
  } | null>(null);
  const [blockEnd, setBlockEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const gridCols = `7.5rem repeat(${windowSize}, var(--col))`;
  const windowEnd = addDays(start, windowSize);

  const handleCellClick = useCallback(
    (e: React.MouseEvent, unitId: string, unitLabel: string, date: string) => {
      const unitBookings = bookings.filter(
        (b) =>
          b.unitId === unitId &&
          b.checkIn <= date &&
          b.checkOut > date &&
          !["cancelled", "payment_rejected", "expired"].includes(b.status),
      );
      if (unitBookings.length > 0) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setBlockEnd(addDays(date, 1));
      setPopup({
        type: "block",
        unitId,
        unitLabel,
        date,
        x: rect.left,
        y: rect.bottom + 4,
      });
    },
    [bookings],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent, booking: CalendarBooking, unitLabel: string) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopup({
        type: "bar",
        unitId: booking.unitId,
        unitLabel,
        booking,
        x: rect.left,
        y: rect.bottom + 4,
      });
    },
    [],
  );

  const handleBlock = useCallback(async () => {
    if (!popup || popup.type !== "block" || !popup.date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: popup.unitId,
          guestName: "Blocked",
          checkIn: popup.date,
          checkOut: blockEnd,
          guests: 0,
          source: "block",
          grossAmount: 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookings((prev) => [
          ...prev,
          {
            id: data.id,
            unitId: popup.unitId,
            checkIn: popup.date!,
            checkOut: blockEnd,
            guest: "Blocked",
            source: "block",
            status: "pending_payment",
            notes: null,
          },
        ]);
        setPopup(null);
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to block dates");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }, [popup, blockEnd, router]);

  const handleUnblock = useCallback(
    async (bookingId: string) => {
      if (!confirm("Unblock these dates?")) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
          setPopup(null);
          router.refresh();
        } else {
          alert("Failed to unblock");
        }
      } catch {
        alert("Network error");
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  return (
    <div className="panel">
      <div className="tlscroll">
        <div className="tl" style={{ gridTemplateColumns: gridCols }}>
          {/* Header */}
          <div className="corner">Unit</div>
          {days.map((d, i) => {
            const dw = dayOfWeek(d);
            const cls =
              d === today ? "dh now" : dw === 0 || dw === 6 ? "dh we" : "dh";
            return (
              <div key={d} className={cls} style={{ gridColumn: i + 2 }}>
                <span className="dow">{DOW[dw]}</span>
                <span className="dd">{Number(d.slice(8, 10))}</span>
              </div>
            );
          })}

          {/* Weekend shading */}
          {days.map((d, i) => {
            const dw = dayOfWeek(d);
            if (dw !== 0 && dw !== 6) return null;
            return (
              <div
                key={`s${d}`}
                className="colshade"
                style={{ gridColumn: i + 2 }}
              />
            );
          })}

          {/* Unit rows */}
          {units.map((u, r) => {
            const unitLabel = `${u.tower}-${u.code}${u.buildingId === "east" ? " E" : ""}`;
            const bars = bookings.filter(
              (b) =>
                b.unitId === u.id &&
                b.checkIn < windowEnd &&
                b.checkOut > start,
            );

            const occupiedDays = new Set<string>();
            for (const b of bars) {
              if (["cancelled", "payment_rejected", "expired"].includes(b.status)) continue;
              const bStart = Math.max(0, nightsBetween(start, b.checkIn));
              const bEnd = Math.min(windowSize, nightsBetween(start, b.checkOut));
              for (let d = bStart; d < bEnd; d++) {
                occupiedDays.add(addDays(start, d));
              }
            }

            return (
              <div key={u.id} style={{ display: "contents" }}>
                <div className="ul" style={{ gridRow: r + 2 }}>
                  <span className="uc">{unitLabel}</span>
                  <span className="un">
                    {u.name ?? (u.buildingId === "west" ? "West" : "East")}
                  </span>
                </div>
                <div className="rowbg" style={{ gridRow: r + 2 }} />

                {/* Clickable empty cells */}
                {days.map((d, i) => {
                  if (occupiedDays.has(d)) return null;
                  return (
                    <div
                      key={`cell-${u.id}-${d}`}
                      className="cal-cell"
                      style={{
                        gridRow: r + 2,
                        gridColumn: i + 2,
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                      onClick={(e) => handleCellClick(e, u.id, unitLabel, d)}
                      title={`Click to block ${unitLabel} on ${d}`}
                    />
                  );
                })}

                {/* Booking bars */}
                {bars.map((b) => {
                  const from = Math.max(0, nightsBetween(start, b.checkIn));
                  const to = Math.min(windowSize, nightsBetween(start, b.checkOut));
                  if (to <= from) return null;
                  return (
                    <div
                      key={b.id}
                      className={`bar ${b.source === "block" || b.status === "blocked" ? "block" : b.source ?? "unknown"}`}
                      style={{
                        gridRow: r + 2,
                        gridColumn: `${from + 2} / ${to + 2}`,
                        cursor: "pointer",
                      }}
                      title={`${b.source === "block" || b.status === "blocked" ? (() => { const m = b.notes?.match(/^Blocked on (\w[\w.]*)/i); return m ? `Blocked (${m[1]})` : "Blocked"; })() : b.guest || "(no name)"} — ${b.checkIn} to ${b.checkOut}\nClick to edit/unblock`}
                      onClick={(e) => handleBarClick(e, b, unitLabel)}
                    >
                      {b.source === "block" || b.status === "blocked" ? (() => { const m = b.notes?.match(/^Blocked on (\w[\w.]*)/i); return m ? `Blocked (${m[1]})` : "Blocked"; })() : b.guest || "(no name)"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        <span>
          <b style={{ background: "var(--ch-direct)" }} /> Direct
        </span>
        <span>
          <b style={{ background: "var(--ch-airbnb)" }} /> Airbnb
        </span>
        <span>
          <b style={{ background: "var(--ch-agoda)" }} /> Agoda
        </span>
        <span>
          <b style={{ background: "var(--ch-fb)" }} /> Facebook
        </span>
        <span>
          <b style={{ background: "var(--ch-block)" }} /> Blocked
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-3)" }}>
          Click empty cell to block &bull; Click bar to edit/unblock
        </span>
      </div>

      {/* Popup */}
      {popup && (
        <div
          className="cal-overlay"
          onClick={() => setPopup(null)}
        >
          <div
            className="cal-popup"
            style={{
              position: "fixed",
              left: Math.min(popup.x, window.innerWidth - 320),
              top: Math.min(popup.y, window.innerHeight - 250),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {popup.type === "block" && popup.date && (
              <>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
                  Block Dates — {popup.unitLabel}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>From</label>
                    <input type="date" value={popup.date} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>To (checkout)</label>
                    <input
                      type="date"
                      value={blockEnd}
                      min={addDays(popup.date, 1)}
                      onChange={(e) => setBlockEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: "0.75rem" }}>
                  {nightsBetween(popup.date, blockEnd)} night(s) blocked
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--surface-2)", color: "var(--text)" }}
                    onClick={() => setPopup(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--ch-block)", color: "#fff" }}
                    disabled={saving}
                    onClick={handleBlock}
                  >
                    {saving ? "Blocking..." : "Block Dates"}
                  </button>
                </div>
              </>
            )}

            {popup.type === "bar" && popup.booking && (() => {
              const isBlock = popup.booking!.source === "block" || popup.booking!.status === "blocked";
              const syncMatch = popup.booking!.notes?.match(/^Blocked on (\w[\w.]*)/i);
              const isSynced = isBlock && !!syncMatch;
              const srcLabel = isSynced ? syncMatch![1] : (popup.booking!.source ? popup.booking!.source.charAt(0).toUpperCase() + popup.booking!.source.slice(1) : "");
              return (
                <>
                  <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem" }}>
                    {isBlock
                      ? `Blocked${isSynced ? ` (from ${srcLabel})` : ""} — ${popup.unitLabel}`
                      : `${popup.booking!.guest || "(no name)"} — ${popup.unitLabel}`}
                  </h3>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: "0.5rem" }}>
                    {popup.booking!.checkIn} to {popup.booking!.checkOut} &bull;{" "}
                    {nightsBetween(popup.booking!.checkIn, popup.booking!.checkOut)} nights
                  </div>

                  {isSynced && (
                    <div style={{
                      fontSize: "0.72rem", padding: "0.4rem 0.6rem", marginBottom: "0.75rem",
                      background: "color-mix(in srgb, var(--warn, #f39c12) 12%, var(--surface))",
                      borderRadius: 4, color: "var(--text-2)",
                    }}>
                      Synced from <strong>{srcLabel}</strong> calendar.
                      Unblocking here will remove it and sync back to {srcLabel} via the export feed.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: "var(--surface-2)", color: "var(--text)" }}
                      onClick={() => setPopup(null)}
                    >
                      Close
                    </button>
                    {isBlock ? (
                      <>
                        <a
                          href={`/admin/bookings/${popup.booking!.id}/edit`}
                          className="btn btn-sm"
                          style={{ background: "var(--accent)", color: "var(--accent-ink)", textDecoration: "none" }}
                        >
                          Edit Details
                        </a>
                        <button
                          className="btn btn-sm"
                          style={{ background: "var(--crit, #c0392b)", color: "#fff" }}
                          disabled={saving}
                          onClick={() => handleUnblock(popup.booking!.id)}
                        >
                          {saving ? "Unblocking..." : "Unblock"}
                        </button>
                      </>
                    ) : (
                      <a
                        href={`/admin/bookings/${popup.booking!.id}/edit`}
                        className="btn btn-sm"
                        style={{ background: "var(--accent)", color: "var(--accent-ink)", textDecoration: "none" }}
                      >
                        Edit Booking
                      </a>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
