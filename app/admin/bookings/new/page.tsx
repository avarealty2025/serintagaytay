"use client";
import { useState } from "react";
import Link from "next/link";
import { UNITS } from "../../../../src/data/units.ts";
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
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentType, setPaymentType] = useState<"reservation" | "full">("reservation");
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

  const parkingTotal = parkingFee > 0
    ? parkingFeeType === "per_night" ? parkingFee * nights : parkingFee
    : 0;

  const grossAmount = totalAmount !== "" ? Number(totalAmount) : (pricing?.total ?? 0) + parkingTotal;
  const balance = grossAmount - amountPaid;

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
            <h2>Payment Summary</h2>
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

              {!pricingError && pricing && !pricing.requiresManualQuote && totalAmount === "" && (
                <>
                  <div className="sep" />
                  <div className="summary-row sm" style={{ color: "var(--text-3)" }}>
                    <span>Suggested rate</span>
                    <span className="mono">{formatPHP(pricing.total + parkingTotal)}</span>
                  </div>
                </>
              )}

              <div className="sep" />

              <div className="field" style={{ marginBottom: "0.75rem" }}>
                <label htmlFor="totalAmount" style={{ fontSize: "0.75rem", fontWeight: 700 }}>Total Amount (PHP)</label>
                <input
                  type="number"
                  id="totalAmount"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  min={0}
                  step={100}
                  placeholder={pricing ? `${(pricing.total + parkingTotal).toLocaleString()}` : "0"}
                  style={{ fontWeight: 700, fontSize: "1.1rem" }}
                />
              </div>

              <div className="field-row" style={{ marginBottom: "0.75rem" }}>
                <div className="field">
                  <label htmlFor="paymentType" style={{ fontSize: "0.75rem" }}>Payment Type</label>
                  <select
                    id="paymentType"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as "reservation" | "full")}
                  >
                    <option value="reservation">Reservation Fee</option>
                    <option value="full">Full Payment</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="amountPaid" style={{ fontSize: "0.75rem" }}>Amount Paid (PHP)</label>
                  <input
                    type="number"
                    id="amountPaid"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                </div>
              </div>

              <div className="sep" />

              <div className="summary-row total">
                <span>Total</span>
                <span className="mono">{formatPHP(grossAmount)}</span>
              </div>
              <div className="summary-row">
                <span>Paid</span>
                <span className="mono" style={{ color: "var(--good)" }}>{formatPHP(amountPaid)}</span>
              </div>
              <div className="summary-row total" style={{ marginTop: "0.25rem" }}>
                <span>{balance <= 0 ? "Status" : "Balance to Collect"}</span>
                {balance <= 0 ? (
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: "var(--good)", padding: "0.2rem 0.6rem", borderRadius: "9px" }}>
                    Fully Paid
                  </span>
                ) : (
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: "var(--crit, #c0392b)", padding: "0.2rem 0.6rem", borderRadius: "9px" }}>
                    {formatPHP(balance)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            className="btn"
            style={{ width: "100%" }}
            disabled={!guestName.trim() || creating || grossAmount <= 0}
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
                    grossAmount,
                    amountPaid,
                    paymentType,
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
