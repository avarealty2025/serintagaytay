"use client";

import { useState } from "react";

export function InvoiceActions({
  bookingId,
  guestEmail,
}: {
  bookingId: string;
  guestEmail: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch(`/api/invoices/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  function handleView() {
    window.open(`/api/invoices/${bookingId}`, "_blank");
  }

  return (
    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
      <button
        className="btn-outline btn-xs"
        type="button"
        onClick={handleView}
        title="View / Download"
      >
        View
      </button>
      <button
        className="btn-xs"
        type="button"
        onClick={handleSend}
        disabled={sending}
        title={`Send to ${guestEmail}`}
        style={sent ? { background: "var(--good)", color: "#fff" } : undefined}
      >
        {sending ? "Sending..." : sent ? "Sent!" : "Email"}
      </button>
      {error && (
        <span style={{ fontSize: "0.65rem", color: "var(--crit)" }}>{error}</span>
      )}
    </div>
  );
}
