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
  { value: "booking.com", label: "Booking.com" },
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
  const [parkingFee, setParkingFee] = useState(0);
  const [parkingFeeType, setParkingFeeType] = useState<"per_night" | "one_time">("one_time");
  const [rateOverride, setRateOverride] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const customRate = rateOverride !== "" ? Number(rateOverride) : null;
  const nightsTotal = customRate !== null && customRate >= 0
    ? customRate * nights
    : pricing?.nightsTotal ?? 0;
  const cleaningFee = pricing?.cleaningFee ?? 0;
  const extraGuestFee = pricing?.extraGuestFee ?? 0;
  const parkingTotal = parkingFee > 0
    ? parkingFeeType === "per_night" ? parkingFee * nights : parkingFee
    : 0;
  const grandTotal = nightsTotal + cleaningFee + extraGuestFee + parkingTotal;

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
              Booking has been saved to the database.
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
              <label htmlFor="rateOverride">Nightly Rate Override (PHP)</label>
              <input
                type="number"
                id="rateOverride"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                min={0}
                step={100}
                placeholder={unit ? `Default: ${unit.baseRate} weekday / ${unit.weekendRate} weekend` : "Leave blank for auto"}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                Leave blank to use unit default rates
              </span>
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

            <div className="field-row">
              <div className="field">
                <label htmlFor="parkingFee">Parking Fee (PHP)</label>
                <input
                  type="number"
                  id="parkingFee"
                  value={parkingFee}
                  onChange={(e) => setParkingFee(Number(e.target.value))}
                  min={0}
                  step={100}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label htmlFor="parkingFeeType">Parking Charge</label>
                <select
                  id="parkingFeeType"
                  value={parkingFeeType}
                  onChange={(e) => setParkingFeeType(e.target.value as "per_night" | "one_time")}
                >
                  <option value="one_time">One-time</option>
                  <option value="per_night">Per night</option>
                </select>
              </div>
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
                {customRate !== null ? (
                  <div className="summary-row">
                    <span>
                      {nights} nights @ {formatPHP(customRate)}
                      <span style={{ fontSize: "0.65rem", color: "var(--warn, #C89F45)", marginLeft: "0.3rem" }}>override</span>
                    </span>
                    <span className="mono">{formatPHP(nightsTotal)}</span>
                  </div>
                ) : (
                  <>
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
                      <span className="mono">{formatPHP(nightsTotal)}</span>
                    </div>
                  </>
                )}
                {cleaningFee > 0 && (
                  <div className="summary-row">
                    <span>Cleaning fee</span>
                    <span className="mono">{formatPHP(cleaningFee)}</span>
                  </div>
                )}
                {extraGuestFee > 0 && (
                  <div className="summary-row">
                    <span>Extra guest ({pricing.extraGuests})</span>
                    <span className="mono">{formatPHP(extraGuestFee)}</span>
                  </div>
                )}
                {parkingTotal > 0 && (
                  <div className="summary-row">
                    <span>
                      Parking{" "}
                      {parkingFeeType === "per_night" ? `(${nights} nights)` : "(one-time)"}
                    </span>
                    <span className="mono">{formatPHP(parkingTotal)}</span>
                  </div>
                )}
                <div className="sep" />
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="mono">{formatPHP(grandTotal)}</span>
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
            disabled={!pricing || !!pricingError || !guestName.trim() || creating}
            onClick={async () => {
              setCreating(true);
              try {
                const res = await fetch("/api/bookings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    unitId,
                    guestName,
                    guestEmail,
                    guestPhone,
                    checkIn,
                    checkOut,
                    guests,
                    source,
                    grossAmount: grandTotal,
                    notes,
                    parkingFee,
                    parkingFeeType,
                  }),
                });
                const data = await res.json();
                if (!res.ok || data.error) {
                  alert(data.error || "Failed to create booking");
                } else {
                  setSubmitted(true);
                }
              } catch {
                alert("Connection error");
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? "Creating..." : "Create Booking"}
          </button>
        </div>
      </div>
    </>
  );
}
