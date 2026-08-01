"use client";
import { useState } from "react";
import Link from "next/link";
import { UNITS, TAAL_VIEW_CODES } from "../../../../src/data/units.ts";
import { quote, formatPHP, PricingError } from "../../../../src/lib/pricing.ts";
import { nightsBetween, addDays, toDateStr } from "../../../../src/lib/dates.ts";
import type { PriceBreakdown } from "../../../../src/lib/types.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 BR",
  "2br": "2 BR",
};

const SOURCES = [
  { value: "direct", label: "Direct" },
  { value: "airbnb", label: "Airbnb" },
  { value: "agoda", label: "Agoda" },
  { value: "facebook", label: "Facebook" },
  { value: "manual", label: "Manual" },
];

export default function NewBookingPage() {
  const today = toDateStr(new Date());
  const active = UNITS.filter((u) => u.active);

  const [unitId, setUnitId] = useState(active[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(addDays(today, 1));
  const [checkOut, setCheckOut] = useState(addDays(today, 3));
  const [guests, setGuests] = useState(2);
  const [source, setSource] = useState("direct");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const unit = active.find((u) => u.id === unitId);
  let pricing: PriceBreakdown | null = null;
  let pricingError: string | null = null;

  if (unit) {
    try {
      pricing = quote(unit, checkIn, checkOut, guests);
    } catch (e) {
      pricingError = e instanceof PricingError ? e.message : "Invalid dates";
    }
  }

  let nights = 0;
  try {
    nights = nightsBetween(checkIn, checkOut);
  } catch {
    /* skip */
  }

  if (submitted) {
    return (
      <>
        <div className="page-head">
          <h1 className="today">Booking Created</h1>
        </div>
        <div className="panel" style={{ padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>&#10003;</div>
            <h2 style={{ margin: "0 0 0.5rem" }}>Booking saved</h2>
            <p style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>
              {guestName || "(no name)"} &middot;{" "}
              {unit ? `${unit.tower}-${unit.code}` : unitId} &middot; {checkIn} to{" "}
              {checkOut}
            </p>
            <p className="notice" style={{ textAlign: "left", marginTop: "1.5rem" }}>
              <strong>Note:</strong> This booking is saved in memory only. It
              will be lost when the server restarts. Connect Supabase to persist
              bookings permanently.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
              <Link href="/admin/bookings" className="btn">
                View all bookings
              </Link>
              <Link href="/admin/bookings/new" className="btn btn-outline">
                Create another
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="today">New Booking</h1>
        <Link href="/admin/bookings" className="btn btn-outline">
          Cancel
        </Link>
      </div>

      <div className="form-grid">
        <div className="panel form-panel">
          <h2>Booking Details</h2>
          <div className="form-body">
            <div className="field">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                {active.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tower}-{u.code}{" "}
                    {u.buildingId === "east" ? "East" : "West"} &middot;{" "}
                    {TYPE_LABEL[u.type]} &middot; Sleeps {u.maxGuests}
                    {u.name ? ` (${u.name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="checkIn">Check-in</label>
                <input
                  type="date"
                  id="checkIn"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="checkOut">Check-out</label>
                <input
                  type="date"
                  id="checkOut"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="guests">Guests</label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {Array.from(
                    { length: unit?.maxGuests ?? 8 },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="source">Source</label>
                <select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="guestName">Guest name</label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Maria Santos"
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="guestEmail">Email</label>
                <input
                  type="email"
                  id="guestEmail"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@email.com"
                />
              </div>
              <div className="field">
                <label htmlFor="guestPhone">Phone</label>
                <input
                  type="tel"
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Special requests, arrival time, etc."
              />
            </div>
          </div>
        </div>

        <div className="form-aside">
          <div className="panel price-summary">
            <h2>Price Summary</h2>
            {pricingError ? (
              <div className="form-body">
                <p style={{ color: "var(--crit)", fontSize: "0.85rem" }}>
                  {pricingError}
                </p>
              </div>
            ) : pricing && !pricing.requiresManualQuote ? (
              <div className="form-body">
                <div className="summary-row">
                  <span>Unit</span>
                  <span className="mono">
                    {unit ? `${unit.tower}-${unit.code}` : "—"}
                  </span>
                </div>
                <div className="summary-row">
                  <span>Nights</span>
                  <span className="mono">{nights}</span>
                </div>
                <div className="summary-row">
                  <span>Guests</span>
                  <span className="mono">{guests}</span>
                </div>
                <div className="sep" />
                {pricing.nights.map((n) => (
                  <div className="summary-row sm" key={n.date}>
                    <span>
                      {n.date}{" "}
                      {n.basis === "weekend" ? "(wknd)" : ""}
                    </span>
                    <span className="mono">{formatPHP(n.rate)}</span>
                  </div>
                ))}
                <div className="sep" />
                <div className="summary-row">
                  <span>Nightly total</span>
                  <span className="mono">{formatPHP(pricing.nightsTotal)}</span>
                </div>
                {pricing.cleaningFee > 0 && (
                  <div className="summary-row">
                    <span>Cleaning fee</span>
                    <span className="mono">
                      {formatPHP(pricing.cleaningFee)}
                    </span>
                  </div>
                )}
                {pricing.extraGuestFee > 0 && (
                  <div className="summary-row">
                    <span>
                      Extra guest ({pricing.extraGuests})
                    </span>
                    <span className="mono">
                      {formatPHP(pricing.extraGuestFee)}
                    </span>
                  </div>
                )}
                <div className="sep" />
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="mono">{formatPHP(pricing.total)}</span>
                </div>
              </div>
            ) : pricing?.requiresManualQuote ? (
              <div className="form-body">
                <p style={{ color: "var(--warn)", fontSize: "0.85rem" }}>
                  Long stay ({nights} nights). Requires manual quote.
                </p>
              </div>
            ) : null}
          </div>

          <button
            className="btn"
            style={{ width: "100%" }}
            disabled={!pricing || !!pricingError || !guestName.trim()}
            onClick={() => setSubmitted(true)}
          >
            Create Booking
          </button>

          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--text-3)",
              textAlign: "center",
              margin: "0.5rem 0 0",
            }}
          >
            Saved in memory until Supabase is connected
          </p>
        </div>
      </div>
    </>
  );
}
