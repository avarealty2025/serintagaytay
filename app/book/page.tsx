"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mark } from "../mark.tsx";
import { Footer } from "../footer.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../../src/data/units.ts";
import {
  quote,
  formatPHP,
  PricingError,
} from "../../src/lib/pricing.ts";
import { nightsBetween, addDays, toDateStr } from "../../src/lib/dates.ts";
import type { PriceBreakdown } from "../../src/lib/types.ts";
import { getSettings } from "../../src/lib/settings.ts";
import { Suspense } from "react";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

type Step = "select" | "details" | "payment" | "submitted";

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
  const settings = getSettings();

  const [step, setStep] = useState<Step>("select");
  const [checkIn, setCheckIn] = useState(sp.get("checkIn") || addDays(today, 1));
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") || addDays(today, 3));
  const [guests, setGuests] = useState(Number(sp.get("guests")) || 2);
  const [unitId, setUnitId] = useState(sp.get("unit") || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [guestList, setGuestList] = useState<string[]>([""]);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [proofPath, setProofPath] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [submitError, setSubmitError] = useState("");

  const selectedUnit = active.find((u) => u.id === unitId);

  let nights = 0;
  try { nights = nightsBetween(checkIn, checkOut); } catch { /* skip */ }

  const results = active.map((unit) => {
    let price: PriceBreakdown | null = null;
    let error: string | null = null;
    try { price = quote(unit, checkIn, checkOut, guests); } catch (e) {
      error = e instanceof PricingError ? e.message : "Not available";
    }
    return { unit, price, error };
  });

  const bookable = results.filter((r) => r.price && !r.price.requiresManualQuote && !r.error);

  let selectedPrice: PriceBreakdown | null = null;
  if (selectedUnit) {
    try { selectedPrice = quote(selectedUnit, checkIn, checkOut, guests); } catch { /* skip */ }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setProofPath("");
  }

  async function handleUpload() {
    if (!proofFile) return;
    setUploading(true);
    setSubmitError("");
    try {
      const form = new FormData();
      form.append("file", proofFile);
      const res = await fetch("/api/upload-proof", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || "Upload failed");
        return;
      }
      setProofPath(data.path);
    } catch {
      setSubmitError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitBooking() {
    if (!selectedUnit || !selectedPrice) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          guestName: name,
          guestEmail: email,
          guestPhone: phone || undefined,
          checkIn,
          checkOut,
          guests: guestList.filter((g) => g.trim()).length || guests,
          source: "direct",
          grossAmount: selectedPrice.total,
          notes: requests || undefined,
          proofPath: proofPath || undefined,
          guestList: guestList.filter((g) => g.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || "Failed to submit booking.");
        return;
      }

      setBookingRef(data.id?.slice(0, 8).toUpperCase() || `SR-${Date.now().toString(36).toUpperCase()}`);
      setStep("submitted");
    } catch {
      setSubmitError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="pub-head">
        <div className="wrap">
          <div className="lockup">
            <Mark />
            <p className="brand">Serin<small>Tagaytay</small></p>
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
          <div className={`step-dot ${step === "details" ? "active" : step === "payment" || step === "submitted" ? "done" : ""}`}>
            <span className="step-n">2</span>
            <span className="step-l">Your details</span>
          </div>
          <div className="step-line" />
          <div className={`step-dot ${step === "payment" ? "active" : step === "submitted" ? "done" : ""}`}>
            <span className="step-n">3</span>
            <span className="step-l">Payment</span>
          </div>
          <div className="step-line" />
          <div className={`step-dot ${step === "submitted" ? "active" : ""}`}>
            <span className="step-n">4</span>
            <span className="step-l">Done</span>
          </div>
        </div>

        {/* STEP 1: Select unit */}
        {step === "select" && (
          <>
            <h2 className="book-title">Choose your dates and unit</h2>
            <form className="searchbar" onSubmit={(e) => e.preventDefault()}>
              <div className="field">
                <label htmlFor="checkIn">Check in</label>
                <input type="date" id="checkIn" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="checkOut">Check out</label>
                <input type="date" id="checkOut" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="guests">Guests</label>
                <select id="guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                  ))}
                </select>
              </div>
            </form>

            {nights > 0 && (
              <p style={{ color: "var(--text-2)", margin: "0 0 1rem" }}>
                <strong>{bookable.length}</strong> units available for {nights} {nights === 1 ? "night" : "nights"}
              </p>
            )}

            <div className="book-units">
              {bookable.map(({ unit, price }) => {
                const taal = TAAL_VIEW_CODES.has(unit.code);
                const selected = unitId === unit.id;
                return (
                  <button key={unit.id} className={`book-unit ${selected ? "selected" : ""}`} onClick={() => setUnitId(unit.id)} type="button">
                    <div className="bu-head">
                      <span className="bu-code">{unit.tower}-{unit.code} {unit.buildingId === "west" ? "West" : "East"}</span>
                      {unit.name && <span className="bu-name">{unit.name}</span>}
                    </div>
                    <div className="bu-facts">
                      <span>{TYPE_LABEL[unit.type]}</span>
                      <span>Sleeps {unit.maxGuests}</span>
                      <span>{taal ? "Taal view" : "Ridge side"}</span>
                    </div>
                    {price && !price.requiresManualQuote && (
                      <div className="bu-price">
                        <span className="bu-total">{formatPHP(price.total)}</span>
                        <span className="bu-per">{nights} {nights === 1 ? "night" : "nights"}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {unitId && (
              <div style={{ textAlign: "right", padding: "1rem 0 2rem" }}>
                <button className="btn" onClick={() => setStep("details")}>Continue</button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: Guest details */}
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
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Santos" required />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="email">Email *</label>
                      <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone</label>
                      <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Guest list (for condo endorsement) *</label>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                      List all guests who will be staying, including yourself. Required for building entry.
                    </p>
                    {guestList.map((g, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)", width: "1.2rem", textAlign: "right" }}>{i + 1}.</span>
                        <input
                          type="text"
                          value={g}
                          onChange={(e) => {
                            const next = [...guestList];
                            next[i] = e.target.value;
                            setGuestList(next);
                          }}
                          placeholder={i === 0 ? "Your full name" : `Guest ${i + 1} full name`}
                          style={{ flex: 1 }}
                        />
                        {guestList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setGuestList(guestList.filter((_, j) => j !== i))}
                            style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "1rem", padding: "0 0.25rem" }}
                            title="Remove"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGuestList([...guestList, ""])}
                      style={{ background: "none", border: "1px dashed var(--line)", borderRadius: "6px", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", padding: "0.35rem 0.75rem", marginTop: "0.25rem" }}
                    >
                      + Add guest
                    </button>
                  </div>
                  <div className="field">
                    <label htmlFor="requests">Special requests</label>
                    <textarea id="requests" value={requests} onChange={(e) => setRequests(e.target.value)} rows={3} placeholder="Arrival time, extra pillows, etc." />
                  </div>
                </div>
              </div>

              <div className="form-aside">
                <div className="panel price-summary">
                  <h2>Booking Summary</h2>
                  <div className="form-body">
                    <div className="summary-row"><span>Unit</span><span className="mono">{selectedUnit.tower}-{selectedUnit.code} {selectedUnit.buildingId === "west" ? "West" : "East"}</span></div>
                    {selectedUnit.name && <div className="summary-row"><span>Name</span><span>{selectedUnit.name}</span></div>}
                    <div className="summary-row"><span>Check-in</span><span className="mono">{checkIn}</span></div>
                    <div className="summary-row"><span>Check-out</span><span className="mono">{checkOut}</span></div>
                    <div className="summary-row"><span>Nights</span><span className="mono">{nights}</span></div>
                    <div className="summary-row"><span>Pax</span><span className="mono">{guestList.filter((g) => g.trim()).length || guests}</span></div>
                    <div className="sep" />
                    {selectedPrice.nights.map((n) => (
                      <div className="summary-row sm" key={n.date}>
                        <span>{n.date} {n.basis === "weekend" ? "(wknd)" : ""}</span>
                        <span className="mono">{formatPHP(n.rate)}</span>
                      </div>
                    ))}
                    <div className="sep" />
                    <div className="summary-row total"><span>Total</span><span className="mono">{formatPHP(selectedPrice.total)}</span></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep("select")}>Back</button>
                  <button className="btn" style={{ flex: 2 }} disabled={!name.trim() || !email.trim() || !guestList.some((g) => g.trim())} onClick={() => setStep("payment")}>
                    Proceed to payment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 3: Payment + proof upload */}
        {step === "payment" && selectedUnit && selectedPrice && (
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem 0 4rem" }}>
            <h2 className="book-title">Send payment &amp; upload proof</h2>

            <div className="panel" style={{ marginBottom: "1rem" }}>
              <h2>Payment Channels</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem" }}>
                  Send <strong>{formatPHP(selectedPrice.total)}</strong> to any of the channels below, then upload a screenshot of your payment.
                </p>

                {settings.payment.gcashName ? (
                  <div className="pay-method">
                    <h4>GCash</h4>
                    <p className="mono">
                      Name: <strong>{settings.payment.gcashName}</strong><br />
                      Number: <strong>{settings.payment.gcashNumber}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="pay-method">
                    <h4>GCash</h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}>To be configured by admin</p>
                  </div>
                )}

                {settings.payment.bankName ? (
                  <div className="pay-method">
                    <h4>Bank Transfer</h4>
                    <p className="mono">
                      Bank: <strong>{settings.payment.bankName}</strong><br />
                      Account Name: <strong>{settings.payment.bankAccountName}</strong><br />
                      Account No.: <strong>{settings.payment.bankAccountNumber}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="pay-method">
                    <h4>Bank Transfer</h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}>To be configured by admin</p>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <h2>Upload Payment Proof</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem" }}>
                  Take a screenshot of your GCash/bank transfer confirmation and upload it here.
                </p>

                <div style={{ border: "2px dashed var(--line)", borderRadius: "8px", padding: "2rem", textAlign: "center", background: proofPreview ? "none" : "var(--surface)" }}>
                  {proofPreview ? (
                    <div>
                      <img
                        src={proofPreview}
                        alt="Payment proof"
                        style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", marginBottom: "0.75rem" }}
                      />
                      <br />
                      {proofPath ? (
                        <span style={{ color: "var(--good)", fontSize: "0.85rem", fontWeight: 600 }}>
                          &#10003; Uploaded successfully
                        </span>
                      ) : (
                        <button className="btn" onClick={handleUpload} disabled={uploading} style={{ fontSize: "0.85rem" }}>
                          {uploading ? "Uploading..." : "Upload this image"}
                        </button>
                      )}
                      <br />
                      <button
                        type="button"
                        onClick={() => { setProofFile(null); setProofPreview(""); setProofPath(""); }}
                        style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "0.78rem", marginTop: "0.5rem" }}
                      >
                        Choose a different image
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer", display: "block" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>&#128247;</div>
                      <p style={{ color: "var(--text-2)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                        Click to select payment screenshot
                      </p>
                      <p style={{ color: "var(--text-3)", fontSize: "0.75rem", margin: 0 }}>
                        JPG, PNG, or WebP — max 10MB
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>

                {submitError && (
                  <p style={{ color: "var(--crit)", fontSize: "0.82rem", margin: "0.75rem 0 0" }}>{submitError}</p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep("details")}>Back</button>
              <button
                className="btn"
                style={{ flex: 2 }}
                disabled={!proofPath || submitting}
                onClick={handleSubmitBooking}
              >
                {submitting ? "Submitting..." : "Submit booking with proof"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Submitted */}
        {step === "submitted" && (
          <div style={{ maxWidth: "560px", margin: "0 auto", padding: "2rem 0 4rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", lineHeight: 1 }}>&#10003;</div>
            <h2 style={{ margin: "0.75rem 0 0.5rem", fontFamily: "var(--display)", fontWeight: 400, fontSize: "1.8rem" }}>
              Booking submitted!
            </h2>
            <p style={{ color: "var(--text-2)", marginBottom: "0.5rem" }}>
              Thank you, {name}! We received your booking and payment proof.
            </p>
            <p style={{ color: "var(--text-2)" }}>
              We will verify your payment and send a <strong>confirmation email</strong> to <strong>{email}</strong> once approved.
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", color: "var(--text-3)" }}>
              Reference: {bookingRef}
            </p>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", paddingTop: "1.5rem" }}>
              <Link href="/" className="btn">Back to home</Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
