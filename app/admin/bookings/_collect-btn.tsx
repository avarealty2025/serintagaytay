"use client";
import { useState } from "react";

export function CollectBtn({ bookingId, balance }: { bookingId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [saving, setSaving] = useState(false);

  if (balance <= 0) return null;

  async function handleCollect(collectFull: boolean) {
    setSaving(true);
    const collected = collectFull ? balance : amount;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid: collected, collectAdd: true }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to update payment");
      }
    } catch {
      alert("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "#fff",
          background: "var(--accent, #2F5A1E)",
          border: "none",
          borderRadius: "6px",
          padding: "0.25rem 0.5rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Collect
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
      <button
        onClick={() => handleCollect(true)}
        disabled={saving}
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "#fff",
          background: "var(--good)",
          border: "none",
          borderRadius: "6px",
          padding: "0.25rem 0.5rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? "..." : "Full"}
      </button>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        min={0}
        max={balance}
        style={{ width: "5rem", fontSize: "0.72rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
      />
      <button
        onClick={() => handleCollect(false)}
        disabled={saving}
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "#fff",
          background: "var(--accent, #2F5A1E)",
          border: "none",
          borderRadius: "6px",
          padding: "0.25rem 0.5rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? "..." : "Partial"}
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{
          fontSize: "0.72rem",
          color: "var(--text-3)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0.2rem",
        }}
      >
        &times;
      </button>
    </div>
  );
}
