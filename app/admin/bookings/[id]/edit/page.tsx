"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UNITS } from "../../../../../src/data/units.ts";

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
  { value: "block", label: "Blocked Dates" },
];

const STATUSES = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "checked_out", label: "Checked Out" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
  { value: "blocked", label: "Blocked" },
];

interface BookingData {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  guestList: string[];
  source: string;
  grossAmount: number;
  notes: string;
  proofPath: string | null;
  paymentType: "reservation" | "full";
  amountPaid: number;
  promoCodeId: string | null;
  discountAmount: number;
  parkingFee: number;
  parkingFeeType: "per_night" | "one_time";
  parkingSlot: string | null;
}

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const active = UNITS.filter((u) => u.active);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [unitId, setUnitId] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [guestList, setGuestList] = useState<string[]>([""]);
  const [source, setSource] = useState("direct");
  const [status, setStatus] = useState("pending_payment");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [grossAmount, setGrossAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<"reservation" | "full">("reservation");
  const [amountPaid, setAmountPaid] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [parkingFee, setParkingFee] = useState(0);
  const [parkingFeeType, setParkingFeeType] = useState<"per_night" | "one_time">("one_time");
  const [parkingSlot, setParkingSlot] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((data: BookingData) => {
        setUnitId(data.unitId);
        setCheckIn(data.checkIn);
        setCheckOut(data.checkOut);
        setGuests(data.guests);
        setGuestList(data.guestList?.length ? data.guestList : [""]);
        setSource(data.source || "direct");
        setStatus(data.status);
        setGuestName(data.guestName);
        setGuestEmail(data.guestEmail || "");
        setGuestPhone(data.guestPhone || "");
        setNotes(data.notes || "");
        setGrossAmount(data.grossAmount || 0);
        setPaymentType(data.paymentType || "reservation");
        setAmountPaid(data.amountPaid || 0);
        setDiscountAmount(data.discountAmount || 0);
        setParkingFee(data.parkingFee || 0);
        setParkingFeeType(data.parkingFeeType || "one_time");
        setParkingSlot(data.parkingSlot || "");
        setLoading(false);
        if (data.proofPath) {
          setProofLoading(true);
          fetch(`/api/proof-url?path=${encodeURIComponent(data.proofPath)}`)
            .then((r) => r.json())
            .then((d) => { if (d.url) setProofUrl(d.url); })
            .catch(() => {})
            .finally(() => setProofLoading(false));
        }
      })
      .catch(() => {
        setError("Failed to load booking");
        setLoading(false);
      });
  }, [bookingId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          guests: guestList.filter((g) => g.trim()).length || guests,
          guestList: guestList.filter((g) => g.trim()),
          source,
          status,
          guestName,
          guestEmail,
          guestPhone,
          notes,
          grossAmount,
          paymentType,
          amountPaid,
          parkingFee,
          parkingFeeType,
          parkingSlot,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/admin/bookings"), 1200);
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const msg = source === "block"
      ? "Unblock these dates? This will make them available for booking again."
      : "Delete this booking? This action cannot be undone.";
    if (!confirm(msg)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to delete");
        return;
      }
      router.push("/admin/bookings");
    } catch {
      setError("Connection error");
    } finally {
      setDeleting(false);
    }
  }

  const isBlock = source === "block";
  const unit = active.find((u) => u.id === unitId);
  const unitLabel = unit ? `${unit.tower}-${unit.code}${unit.buildingId === "east" ? " E" : ""}` : unitId;

  if (loading) {
    return (
      <div className="page-head">
        <h1 className="today">Loading...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">{isBlock ? "Edit Blocked Dates" : "Edit Booking"}</h1>
          {unitId && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: "0.15rem" }}>
              Unit: <strong>{unitLabel}</strong>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn"
            style={{ background: "var(--crit, #c0392b)", color: "#fff" }}
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : isBlock ? "Unblock Dates" : "Delete Booking"}
          </button>
          <Link href="/admin/bookings" className="btn btn-outline">
            Back
          </Link>
        </div>
      </div>

      {success && (
        <div className="notice" style={{ background: "var(--good)", color: "#fff", marginBottom: "1rem" }}>
          Booking updated successfully. Redirecting...
        </div>
      )}
      {error && (
        <div className="notice" style={{ background: "var(--crit)", color: "#fff", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="form-grid">
        <div className="panel form-panel">
          <h2>Booking Details</h2>
          <div className="form-body">
            <div className="field-row">
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="source">Source</label>
                <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="checkIn">Check-in</label>
                <input type="date" id="checkIn" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="checkOut">Check-out</label>
                <input type="date" id="checkOut" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="grossAmount">Total Amount (PHP)</label>
                <input
                  type="number"
                  id="grossAmount"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="field">
                <label>Pax</label>
                <input type="text" value={guestList.filter((g) => g.trim()).length || guests} disabled />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="paymentType">Payment Type</label>
                <select id="paymentType" value={paymentType} onChange={(e) => setPaymentType(e.target.value as "reservation" | "full")}>
                  <option value="reservation">Reservation Fee Only</option>
                  <option value="full">Full Payment</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="amountPaid">Amount Paid (PHP)</label>
                <input
                  type="number"
                  id="amountPaid"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  min={0}
                  step={0.01}
                />
              </div>
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
                />
              </div>
              <div className="field">
                <label htmlFor="parkingFeeType">Parking Charge</label>
                <select id="parkingFeeType" value={parkingFeeType} onChange={(e) => setParkingFeeType(e.target.value as "per_night" | "one_time")}>
                  <option value="one_time">One-time</option>
                  <option value="per_night">Per night</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="parkingSlot">Parking Slot No.</label>
              <input
                type="text"
                id="parkingSlot"
                value={parkingSlot}
                onChange={(e) => setParkingSlot(e.target.value)}
                placeholder="e.g. B1-05, P2-12"
              />
            </div>

            {paymentType === "reservation" && grossAmount > 0 && amountPaid > 0 && amountPaid < grossAmount && (
              <div style={{ padding: "0.6rem 0.9rem", background: "color-mix(in srgb, var(--warn, #C89F45) 12%, transparent)", borderRadius: "6px", borderLeft: "3px solid var(--warn, #C89F45)", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-2)" }}>
                  <strong>Balance:</strong> PHP {(grossAmount - amountPaid).toLocaleString("en-PH", { minimumFractionDigits: 2 })} — to be settled on or before arrival
                </p>
              </div>
            )}
            {paymentType === "full" && amountPaid >= grossAmount && grossAmount > 0 && (
              <div style={{ padding: "0.6rem 0.9rem", background: "color-mix(in srgb, var(--good) 12%, transparent)", borderRadius: "6px", borderLeft: "3px solid var(--good)", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--good)", fontWeight: 600 }}>
                  Fully Paid
                </p>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={{ padding: "0.6rem 0.9rem", background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderRadius: "6px", borderLeft: "3px solid var(--accent)", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-2)" }}>
                  <strong>Promo Discount Applied:</strong> PHP {discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="form-aside">
          {isBlock ? (
            <div className="panel form-panel">
              <h2>Block Info</h2>
              <div className="form-body">
                <div style={{ padding: "0.75rem", background: "color-mix(in srgb, var(--ch-block) 12%, transparent)", borderRadius: "6px", borderLeft: "3px solid var(--ch-block)", marginBottom: "0.75rem" }}>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-2)" }}>
                    These dates are <strong>blocked</strong> and unavailable for booking. Change the dates above or click <strong>Unblock Dates</strong> to make them available again.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="notes">Reason / Notes</label>
                  <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Owner stay, maintenance, renovation..." />
                </div>
              </div>
            </div>
          ) : (
            <div className="panel form-panel">
              <h2>Guest Information</h2>
              <div className="form-body">
                <div className="field">
                  <label htmlFor="guestName">Primary guest name</label>
                  <input type="text" id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="guestEmail">Email</label>
                    <input type="email" id="guestEmail" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="guestPhone">Phone</label>
                    <input type="tel" id="guestPhone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>Guest List (for endorsement)</label>
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
                        placeholder={`Guest ${i + 1}`}
                        style={{ flex: 1 }}
                      />
                      {guestList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setGuestList(guestList.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "1rem", padding: "0 0.25rem" }}
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
                  <label htmlFor="notes">Notes</label>
                  <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
            </div>
          )}

          {(proofUrl || proofLoading) && (
            <div className="panel form-panel" style={{ marginTop: "1rem" }}>
              <h2>Payment Proof</h2>
              <div className="form-body">
                {proofLoading ? (
                  <p style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>Loading proof image...</p>
                ) : proofUrl ? (
                  <div>
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px", border: "1px solid var(--line)", cursor: "pointer" }}
                      />
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.5rem" }}>
                      Click image to open full size in new tab
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <button
            className="btn"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={saving || (!isBlock && !guestName.trim())}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
