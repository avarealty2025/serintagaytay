"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mark } from "../mark.tsx";
import { Footer } from "../footer.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../../src/data/units.ts";
import {
  quote,
  formatPHP,
  PricingError,
  LONG_STAY_NIGHTS,
} from "../../src/lib/pricing.ts";
import { nightsBetween, addDays, toDateStr } from "../../src/lib/dates.ts";
import type { PriceBreakdown } from "../../src/lib/types.ts";
import { getSettings } from "../../src/lib/settings.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

type Step = "select" | "details" | "confirm";

import { Suspense } from "react";

export default function BookPage() {
  return (
    <Suspense>
      <BookPageInner />
    </Suspense>
  );
}

function BookPageInner() {
  const sp = useSearchParams();
  const today = toDateStr(new Date());
  const active = UNITS.filter((u) => u.active);

  const [step, setStep] = useState<Step>("select");
  const [checkIn, setCheckIn] = useState(sp.get("checkIn") || addDays(today, 1));
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") || addDays(today, 3));
  const [guests, setGuests] = useState(Number(sp.get("guests")) || 2);
  const [unitId, setUnitId] = useState(sp.get("unit") || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");

  const selectedUnit = active.find((u) => u.id === unitId);

  let nights = 0;
  try {
    nights = nightsBetween(checkIn, checkOut);
  } catch {
    /* skip */
  }

  const results = active.map((unit) => {
    let price: PriceBreakdown | null = null;
    let error: string | null = null;
    try {
      price = quote(unit, checkIn, checkOut, guests);
    } catch (e) {
      error = e instanceof PricingError ? e.message : "Not available";
    }
    return { unit, price, error };
  });

  const bookable = results.filter(
    (r) => r.price && !r.price.requiresManualQuote && !r.error,
  );

  let selectedPrice: PriceBreakdown | null = null;
  if (selectedUnit) {
    try {
      selectedPrice = quote(selectedUnit, checkIn, checkOut, guests);
    } catch {
      /* skip */
    }
  }

  return (
    <>
      <header className="pub-head">
        <div className="wrap">
          <div className="lockup">
            <Mark />
            <p className="brand">
              Serin
              <small>Tagaytay</small>
            </p>
          </div>
          <nav>
            <Link href="/">Stay</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <div className="wrap">
        <div className="book-steps">
          <div className={`step-dot ${step === "select" ? "active" : "done"}`}>
            <span className="step-n">1</span>
            <span className="step-l">Select unit</span>
          </div>
          <div className="step-line" />
          <div className={`step-dot ${step === "details" ? "active" : step === "confirm" ? "done" : ""}`}>
            <span className="step-n">2</span>
            <span className="step-l">Your details</span>
          </div>
          <div className="step-line" />
          <div className={`step-dot ${step === "confirm" ? "active" : ""}`}>
            <span className="step-n">3</span>
            <span className="step-l">Confirmation</span>
          </div>
        </div>

        {step === "select" && (
          <>
            <h2 className="book-title">Choose your dates and unit</h2>

            <form
              className="searchbar"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="field">
                <label htmlFor="checkIn">Check in</label>
                <input
                  type="date"
                  id="checkIn"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="checkOut">Check out</label>
                <input
                  type="date"
                  id="checkOut"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="guests">Guests</label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            {nights > 0 && (
              <p style={{ color: "var(--text-2)", margin: "0 0 1rem" }}>
                <strong>{bookable.length}</strong> units available for {nights}{" "}
                {nights === 1 ? "night" : "nights"}
              </p>
            )}

            <div className="book-units">
              {bookable.map(({ unit, price }) => {
                const taal = TAAL_VIEW_CODES.has(unit.code);
                const selected = unitId === unit.id;
                return (
                  <button
                    key={unit.id}
                    className={`book-unit ${selected ? "selected" : ""}`}
                    onClick={() => setUnitId(unit.id)}
                    type="button"
                  >
                    <div className="bu-head">
                      <span className="bu-code">
                        {unit.tower}-{unit.code}{" "}
                        {unit.buildingId === "west" ? "West" : "East"}
                      </span>
                      {unit.name && <span className="bu-name">{unit.name}</span>}
                    </div>
                    <div className="bu-facts">
                      <span>{TYPE_LABEL[unit.type]}</span>
                      <span>Sleeps {unit.maxGuests}</span>
                      <span>{taal ? "Taal view" : "Ridge side"}</span>
                    </div>
                    {price && !price.requiresManualQuote && (
                      <div className="bu-price">
                        <span className="bu-total">
                          {formatPHP(price.total)}
                        </span>
                        <span className="bu-per">
                          {nights} {nights === 1 ? "night" : "nights"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {unitId && (
              <div style={{ textAlign: "right", padding: "1rem 0 2rem" }}>
                <button
                  className="btn"
                  onClick={() => setStep("details")}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}

        {step === "details" && selectedUnit && selectedPrice && (
          <>
            <h2 className="book-title">Your details</h2>

            <div className="form-grid">
              <div className="form-panel" style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "0" }}>
                <h3 style={{ padding: "0.65rem 0.9rem", borderBottom: "1px solid var(--line)", margin: 0, fontSize: "0.65rem", letterSpacing: "0.17em", textTransform: "uppercase", fontWeight: 700, color: "var(--text-2)" }}>
                  Guest Information
                </h3>
                <div className="form-body">
                  <div className="field">
                    <label htmlFor="name">Full name *</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Maria Santos"
                      required
                    />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone</label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="requests">Special requests</label>
                    <textarea
                      id="requests"
                      value={requests}
                      onChange={(e) => setRequests(e.target.value)}
                      rows={3}
                      placeholder="Arrival time, extra pillows, etc."
                    />
                  </div>
                </div>
              </div>

              <div className="form-aside">
                <div className="panel price-summary">
                  <h2>Booking Summary</h2>
                  <div className="form-body">
                    <div className="summary-row">
                      <span>Unit</span>
                      <span className="mono">
                        {selectedUnit.tower}-{selectedUnit.code}{" "}
                        {selectedUnit.buildingId === "west" ? "West" : "East"}
                      </span>
                    </div>
                    {selectedUnit.name && (
                      <div className="summary-row">
                        <span>Name</span>
                        <span>{selectedUnit.name}</span>
                      </div>
                    )}
                    <div className="summary-row">
                      <span>Check-in</span>
                      <span className="mono">{checkIn}</span>
                    </div>
                    <div className="summary-row">
                      <span>Check-out</span>
                      <span className="mono">{checkOut}</span>
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
                    {selectedPrice.nights.map((n) => (
                      <div className="summary-row sm" key={n.date}>
                        <span>
                          {n.date} {n.basis === "weekend" ? "(wknd)" : ""}
                        </span>
                        <span className="mono">{formatPHP(n.rate)}</span>
                      </div>
                    ))}
                    <div className="sep" />
                    <div className="summary-row total">
                      <span>Total</span>
                      <span className="mono">
                        {formatPHP(selectedPrice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setStep("select")}
                  >
                    Back
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 2 }}
                    disabled={!name.trim() || !email.trim()}
                    onClick={() => setStep("confirm")}
                  >
                    Confirm booking
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === "confirm" && selectedUnit && selectedPrice && (
          <ConfirmStep
            unit={selectedUnit}
            price={selectedPrice}
            name={name}
            email={email}
            phone={phone}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            guests={guests}
          />
        )}
      </div>

      <Footer />
    </>
  );
}

function ConfirmStep({
  unit,
  price,
  name: guestName,
  email,
  phone,
  checkIn,
  checkOut,
  nights,
  guests,
}: {
  unit: (typeof UNITS)[number];
  price: PriceBreakdown;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
}) {
  const settings = getSettings();
  const ref = useRef(`SR-${Date.now().toString(36).toUpperCase()}`).current;
  const [emailStatus, setEmailStatus] = useState<"sending" | "sent" | "failed" | "not_configured">("sending");
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName,
        email,
        unitId: unit.id,
        checkIn,
        checkOut,
        nights,
        guests,
        total: price.total,
        ref,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setEmailStatus("sent");
        else if (d.html_preview) setEmailStatus("not_configured");
        else setEmailStatus("failed");
      })
      .catch(() => setEmailStatus("failed"));
  }, []);

  const receiptParams = new URLSearchParams({
    unit: unit.id,
    name: guestName,
    email,
    phone,
    checkIn,
    checkOut,
    guests: String(guests),
    total: String(price.total),
    nights: String(nights),
    ref,
  });

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 0 4rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "4rem", color: "var(--good)", lineHeight: 1 }}>
          &#10003;
        </div>
        <h2
          style={{
            margin: "0.75rem 0 0.5rem",
            fontFamily: "var(--display)",
            fontWeight: 400,
            fontSize: "1.8rem",
          }}
        >
          Booking request received
        </h2>
        <p style={{ color: "var(--text-2)" }}>
          Thank you, {guestName}! Your reservation is being processed.
        </p>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: "0.82rem",
            color: "var(--text-3)",
          }}
        >
          Reference: {ref}
        </p>
        {emailStatus === "sent" && (
          <p style={{ fontSize: "0.78rem", color: "var(--good)" }}>
            Confirmation email sent to {email}
          </p>
        )}
        {emailStatus === "sending" && (
          <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
            Sending confirmation email...
          </p>
        )}
        {emailStatus === "not_configured" && (
          <p style={{ fontSize: "0.78rem", color: "var(--warn)" }}>
            Email confirmation will be available once configured by admin
          </p>
        )}
      </div>

      <div className="panel price-summary">
        <h2>Reservation Details</h2>
        <div className="form-body">
          <div className="summary-row">
            <span>Unit</span>
            <span className="mono">
              {unit.tower}-{unit.code}{" "}
              {unit.name ?? (unit.buildingId === "west" ? "West" : "East")}
            </span>
          </div>
          <div className="summary-row">
            <span>Dates</span>
            <span className="mono">
              {checkIn} to {checkOut} ({nights} nights)
            </span>
          </div>
          <div className="summary-row">
            <span>Guests</span>
            <span className="mono">{guests}</span>
          </div>
          <div className="summary-row">
            <span>Check-in</span>
            <span>{settings.booking.checkInTime}</span>
          </div>
          <div className="summary-row">
            <span>Check-out</span>
            <span>{settings.booking.checkOutTime}</span>
          </div>
          <div className="sep" />
          <div className="summary-row total">
            <span>Total</span>
            <span className="mono">{formatPHP(price.total)}</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <h2>
          Payment Instructions{" "}
          <span className="hint">to confirm your booking</span>
        </h2>
        <div className="form-body">
          <p style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
            To confirm your reservation, please send your payment within{" "}
            {settings.booking.holdDurationHours} hours. Your booking will be
            held until payment is received.
          </p>

          {settings.payment.gcashName ? (
            <div className="pay-method">
              <h4>GCash</h4>
              <p className="mono">
                Name: <strong>{settings.payment.gcashName}</strong>
                <br />
                Number: <strong>{settings.payment.gcashNumber}</strong>
              </p>
            </div>
          ) : (
            <div className="pay-method">
              <h4>GCash</h4>
              <p
                style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}
              >
                To be configured by admin
              </p>
            </div>
          )}

          {settings.payment.bankName ? (
            <div className="pay-method">
              <h4>Bank Transfer</h4>
              <p className="mono">
                Bank: <strong>{settings.payment.bankName}</strong>
                <br />
                Account Name: <strong>{settings.payment.bankAccountName}</strong>
                <br />
                Account No.: <strong>{settings.payment.bankAccountNumber}</strong>
              </p>
            </div>
          ) : (
            <div className="pay-method">
              <h4>Bank Transfer</h4>
              <p
                style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}
              >
                To be configured by admin
              </p>
            </div>
          )}

          {settings.payment.instructions && (
            <p style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
              {settings.payment.instructions}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          paddingTop: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/receipt?${receiptParams.toString()}`}
          className="btn"
          target="_blank"
        >
          View Receipt
        </Link>
        <Link href="/" className="btn-outline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
