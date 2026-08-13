"use client";

import { useState } from "react";
import Link from "next/link";
import { UNITS } from "../../src/data/units.ts";

interface BookingResult {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string;
  grossAmount: number;
  guests: number;
  paymentType: string;
  amountPaid: number;
  discountAmount: number;
  createdAt: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}

function getUnitLabel(unitId: string): string {
  const u = UNITS.find((u) => u.id === unitId);
  return u ? (u.name || `${u.tower}-${u.code}`) : unitId;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPHP(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  payment_rejected: "Payment Rejected",
  expired: "Expired",
  no_show: "No Show",
  blocked: "Blocked",
};

const STATUS_CLASS: Record<string, string> = {
  confirmed: "status-good",
  checked_in: "status-good",
  checked_out: "status-good",
  pending_payment: "status-warn",
  cancelled: "status-crit",
  payment_rejected: "status-crit",
  expired: "status-crit",
  no_show: "status-crit",
};

export default function MyBookingPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingResult[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BookingResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    setBookings(null);
    setSelected(null);
    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setBookings(data.bookings);
      if (data.bookings.length === 1) setSelected(data.bookings[0]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="pub-head">
        <div className="wrap">
          <div className="lockup">
            <Link href="/" className="brand">
              <span style={{ color: "var(--serin-gold)", fontSize: "1.1rem", fontWeight: 400, letterSpacing: "1px" }}>
                SERIN
              </span>
              <small style={{ display: "block", fontSize: "0.55rem", letterSpacing: "3px", opacity: 0.7 }}>
                TAGAYTAY
              </small>
            </Link>
          </div>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/book">Book</Link>
            <Link href="/my-booking" style={{ fontWeight: 600 }}>My Booking</Link>
          </nav>
        </div>
      </header>

      <div className="wrap" style={{ maxWidth: 720, paddingTop: "2rem", paddingBottom: "4rem" }}>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "1.8rem", margin: "0 0 0.25rem" }}>
          Check Your Booking
        </h1>
        <p style={{ color: "var(--text-2)", margin: "0 0 2rem", fontSize: "0.9rem" }}>
          Enter the name and email you used when booking to view your reservation details.
        </p>

        <form onSubmit={handleSearch} className="mb-form">
          <div className="mb-form-row">
            <div className="mb-field">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                required
              />
            </div>
            <div className="mb-field">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. juan@email.com"
                required
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            {loading ? "Searching..." : "Find My Booking"}
          </button>
        </form>

        {error && (
          <div className="mb-notice mb-notice-err">
            {error}
          </div>
        )}

        {bookings !== null && bookings.length === 0 && (
          <div className="mb-notice mb-notice-empty">
            No bookings found with that name and email. Please check that you entered the exact name and email used during booking.
          </div>
        )}

        {bookings && bookings.length > 1 && !selected && (
          <div style={{ marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>
              We found {bookings.length} bookings
            </h2>
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                className="mb-booking-card"
                onClick={() => setSelected(b)}
              >
                <div>
                  <strong>{getUnitLabel(b.unitId)}</strong>
                  <span className="mb-dates">
                    {formatDate(b.checkIn)} — {formatDate(b.checkOut)}
                  </span>
                </div>
                <span className={`mb-status ${STATUS_CLASS[b.status] || ""}`}>
                  {STATUS_LABEL[b.status] || b.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="mb-detail" style={{ marginTop: "1.5rem" }}>
            {bookings && bookings.length > 1 && (
              <button
                className="back-link"
                type="button"
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "1rem" }}
              >
                &larr; Back to all bookings
              </button>
            )}

            <div className="mb-detail-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {getUnitLabel(selected.unitId)}
                </h2>
                <p style={{ margin: "0.25rem 0 0", color: "var(--text-3)", fontSize: "0.8rem" }}>
                  Ref: {selected.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <span className={`mb-status-lg ${STATUS_CLASS[selected.status] || ""}`}>
                {STATUS_LABEL[selected.status] || selected.status}
              </span>
            </div>

            <div className="mb-grid">
              <div className="mb-info-card">
                <h3>Stay Details</h3>
                <div className="mb-info-row">
                  <span>Check-in</span>
                  <strong>{formatDate(selected.checkIn)}</strong>
                </div>
                <div className="mb-info-row">
                  <span>Check-out</span>
                  <strong>{formatDate(selected.checkOut)}</strong>
                </div>
                <div className="mb-info-row">
                  <span>Nights</span>
                  <strong>{nightsBetween(selected.checkIn, selected.checkOut)}</strong>
                </div>
                <div className="mb-info-row">
                  <span>Guests</span>
                  <strong>{selected.guests}</strong>
                </div>
              </div>

              <div className="mb-info-card">
                <h3>Payment</h3>
                <div className="mb-info-row">
                  <span>Total Amount</span>
                  <strong>{formatPHP(selected.grossAmount)}</strong>
                </div>
                {selected.discountAmount > 0 && (
                  <div className="mb-info-row">
                    <span>Discount</span>
                    <strong style={{ color: "var(--crit)" }}>-{formatPHP(selected.discountAmount)}</strong>
                  </div>
                )}
                <div className="mb-info-row">
                  <span>Amount Paid</span>
                  <strong style={{ color: "var(--good)" }}>{formatPHP(selected.amountPaid || 0)}</strong>
                </div>
                {selected.paymentType === "reservation" && (
                  <div className="mb-info-row">
                    <span>Payment Type</span>
                    <strong>Reservation Fee</strong>
                  </div>
                )}
                {(() => {
                  const balance = selected.grossAmount - (selected.amountPaid || 0) - (selected.discountAmount || 0);
                  if (balance > 0) {
                    return (
                      <div className="mb-info-row" style={{ borderTop: "2px solid var(--line)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                        <span style={{ fontWeight: 600 }}>Balance Due</span>
                        <strong style={{ color: "var(--crit)", fontSize: "1.05rem" }}>{formatPHP(balance)}</strong>
                      </div>
                    );
                  }
                  return (
                    <div className="mb-info-row" style={{ borderTop: "2px solid var(--line)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                      <span style={{ fontWeight: 600 }}>Payment</span>
                      <strong style={{ color: "var(--good)" }}>Fully Paid</strong>
                    </div>
                  );
                })()}
              </div>
            </div>

            {selected.status === "confirmed" && (
              <div className="mb-checkin-box">
                <h3>Check-in Instructions</h3>
                <ul>
                  <li>Check-in time is <strong>2:00 PM</strong>. Check-out is at <strong>12:00 PM (noon)</strong>.</li>
                  <li>Proceed to the building lobby and present a <strong>valid government ID</strong>.</li>
                  <li>Your unit key card will be provided at the front desk or via lockbox — details will be sent separately.</li>
                  {selected.paymentType === "reservation" && selected.amountPaid < selected.grossAmount && (
                    <li>Please settle the <strong>remaining balance of {formatPHP(selected.grossAmount - (selected.amountPaid || 0) - (selected.discountAmount || 0))}</strong> on or before arrival.</li>
                  )}
                  <li>Wi-Fi password and unit access instructions will be provided upon check-in.</li>
                </ul>
                <h4>House Rules</h4>
                <ul>
                  <li>No smoking inside the unit</li>
                  <li>No pets allowed</li>
                  <li>No parties or events</li>
                  <li>Quiet hours: 10 PM to 7 AM</li>
                  <li>Maximum guests as per unit capacity</li>
                </ul>
              </div>
            )}

            {selected.status === "pending_payment" && (
              <div className="mb-pending-box">
                <h3>Awaiting Confirmation</h3>
                <p>
                  Your booking request has been received. We are reviewing your payment proof and will send a confirmation email once approved.
                  If you haven't submitted payment yet, please send your proof of payment to confirm your reservation.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="pub-foot">
        <div className="wrap">
          <p>&copy; {new Date().getFullYear()} Serin Tagaytay Staycation</p>
        </div>
      </footer>
    </>
  );
}
