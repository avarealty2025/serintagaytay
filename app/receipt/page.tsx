"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { UNITS } from "../../src/data/units.ts";
import { formatPHP } from "../../src/lib/pricing.ts";
import { getSettings } from "../../src/lib/settings.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

function ReceiptContent() {
  const sp = useSearchParams();
  const settings = getSettings();

  const unitId = sp.get("unit") ?? "";
  const name = sp.get("name") ?? "Guest";
  const email = sp.get("email") ?? "";
  const phone = sp.get("phone") ?? "";
  const checkIn = sp.get("checkIn") ?? "";
  const checkOut = sp.get("checkOut") ?? "";
  const guests = Number(sp.get("guests")) || 2;
  const total = Number(sp.get("total")) || 0;
  const nights = Number(sp.get("nights")) || 0;
  const ref = sp.get("ref") ?? `SR-${Date.now().toString(36).toUpperCase()}`;

  const unit = UNITS.find((u) => u.id === unitId);

  return (
    <div className="receipt-page">
      <div className="receipt">
        <div className="receipt-header">
          <div>
            <h1 className="receipt-biz">{settings.business.name}</h1>
            <p className="receipt-addr">{settings.business.address}</p>
            {settings.business.phone && (
              <p className="receipt-addr">{settings.business.phone}</p>
            )}
            {settings.business.email && (
              <p className="receipt-addr">{settings.business.email}</p>
            )}
            <p className="receipt-addr">serintagaytaystaycation.com</p>
          </div>
          <div className="receipt-ref">
            <p className="receipt-ref-label">Acknowledgement Receipt</p>
            <p className="receipt-ref-num">{ref}</p>
            <p className="receipt-ref-date">
              {new Date().toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="receipt-sep" />

        <div className="receipt-section">
          <h2>Guest Information</h2>
          <div className="receipt-row">
            <span>Name</span>
            <span>{name}</span>
          </div>
          {email && (
            <div className="receipt-row">
              <span>Email</span>
              <span>{email}</span>
            </div>
          )}
          {phone && (
            <div className="receipt-row">
              <span>Phone</span>
              <span>{phone}</span>
            </div>
          )}
        </div>

        <div className="receipt-section">
          <h2>Reservation Details</h2>
          <div className="receipt-row">
            <span>Unit</span>
            <span>
              {unit
                ? `${unit.tower}-${unit.code} ${unit.buildingId === "west" ? "West" : "East"}`
                : unitId}
              {unit?.name ? ` (${unit.name})` : ""}
            </span>
          </div>
          {unit && (
            <div className="receipt-row">
              <span>Type</span>
              <span>{TYPE_LABEL[unit.type]}</span>
            </div>
          )}
          <div className="receipt-row">
            <span>Check-in</span>
            <span>
              {checkIn} at {settings.booking.checkInTime}
            </span>
          </div>
          <div className="receipt-row">
            <span>Check-out</span>
            <span>
              {checkOut} at {settings.booking.checkOutTime}
            </span>
          </div>
          <div className="receipt-row">
            <span>Nights</span>
            <span>{nights}</span>
          </div>
          <div className="receipt-row">
            <span>Guests</span>
            <span>{guests}</span>
          </div>
        </div>

        <div className="receipt-section">
          <h2>Amount</h2>
          <div className="receipt-row receipt-total">
            <span>Total Amount Due</span>
            <span className="mono">{formatPHP(total)}</span>
          </div>
        </div>

        <div className="receipt-sep" />

        <div className="receipt-section">
          <h2>Payment Methods</h2>
          {settings.payment.gcashName && (
            <div className="receipt-pay">
              <strong>GCash</strong>
              <p>
                {settings.payment.gcashName}
                <br />
                {settings.payment.gcashNumber}
              </p>
            </div>
          )}
          {settings.payment.bankName && (
            <div className="receipt-pay">
              <strong>{settings.payment.bankName}</strong>
              <p>
                {settings.payment.bankAccountName}
                <br />
                {settings.payment.bankAccountNumber}
              </p>
            </div>
          )}
          {!settings.payment.gcashName && !settings.payment.bankName && (
            <p style={{ color: "var(--text-3)", fontSize: "0.82rem" }}>
              Payment details to be configured by admin.
            </p>
          )}
        </div>

        <div className="receipt-section">
          <h2>House Rules</h2>
          <ul className="receipt-rules">
            {settings.houseRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="receipt-footer">
          <p>
            This is an acknowledgement of your booking request. Your
            reservation is confirmed once payment is verified. Please keep this
            receipt for your records.
          </p>
          <p className="receipt-brand">{settings.business.name}</p>
        </div>

        <div className="receipt-actions no-print">
          <button className="btn" onClick={() => window.print()} type="button">
            Print Receipt
          </button>
          <a href="/" className="btn-outline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="receipt-page">
          <p>Loading receipt...</p>
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
