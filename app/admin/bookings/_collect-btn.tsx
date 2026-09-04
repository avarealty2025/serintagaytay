"use client";
import { useState } from "react";

export function CollectBtn({
  bookingId,
  balance,
  collectedBy,
  collectedAt,
}: {
  bookingId: string;
  balance: number;
  collectedBy?: string | null;
  collectedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [collector, setCollector] = useState("");
  const [saving, setSaving] = useState(false);

  if (balance <= 0 && collectedBy) {
    return (
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--good, #27ae60)",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Collected by {collectedBy}
        {collectedAt && (
          <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: "0.25rem" }}>
            {new Date(collectedAt).toLocaleDateString()}
          </span>
        )}
      </span>
    );
  }

  if (balance <= 0) return null;

  async function handleCollect(collectFull: boolean) {
    if (!collector.trim()) {
      alert("Please enter your name (who is collecting)");
      return;
    }
    setSaving(true);
    const collected = collectFull ? balance : amount;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: collected,
          collectAdd: true,
          collectedBy: collector.trim(),
        }),
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
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "#fff",
          background: "#c0392b",
          border: "none",
          borderRadius: "8px",
          padding: "0.4rem 0.75rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(192,57,43,0.3)",
          letterSpacing: "0.02em",
        }}
      >
        Collect Payment
      </button>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface, #fff)",
        border: "2px solid var(--accent, #2F5A1E)",
        borderRadius: "10px",
        padding: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        minWidth: "220px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.8rem", color: "var(--text)" }}>
          Collect Payment
        </strong>
        <button
          onClick={() => setOpen(false)}
          style={{
            fontSize: "1rem",
            color: "var(--text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0.2rem",
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <div>
        <label style={{ fontSize: "0.72rem", color: "var(--text-2)", fontWeight: 600 }}>
          Collected by *
        </label>
        <input
          type="text"
          value={collector}
          onChange={(e) => setCollector(e.target.value)}
          placeholder="Your name (e.g. April, Ate Jona)"
          style={{
            width: "100%",
            fontSize: "0.8rem",
            padding: "0.35rem 0.5rem",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            marginTop: "0.2rem",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: "0.72rem", color: "var(--text-2)", fontWeight: 600 }}>
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={0}
          max={balance}
          style={{
            width: "100%",
            fontSize: "0.85rem",
            padding: "0.35rem 0.5rem",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            marginTop: "0.2rem",
            fontWeight: 600,
            boxSizing: "border-box",
          }}
        />
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.68rem", color: "var(--text-3)" }}>
          Balance: PHP {balance.toLocaleString()}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          onClick={() => handleCollect(true)}
          disabled={saving || !collector.trim()}
          style={{
            flex: 1,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            background: "var(--good, #27ae60)",
            border: "none",
            borderRadius: "6px",
            padding: "0.4rem 0.5rem",
            cursor: collector.trim() ? "pointer" : "not-allowed",
            opacity: collector.trim() ? 1 : 0.5,
          }}
        >
          {saving ? "..." : "Collect Full"}
        </button>
        <button
          onClick={() => handleCollect(false)}
          disabled={saving || !collector.trim() || amount <= 0}
          style={{
            flex: 1,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            background: "var(--accent, #2F5A1E)",
            border: "none",
            borderRadius: "6px",
            padding: "0.4rem 0.5rem",
            cursor: collector.trim() && amount > 0 ? "pointer" : "not-allowed",
            opacity: collector.trim() && amount > 0 ? 1 : 0.5,
          }}
        >
          {saving ? "..." : "Collect Partial"}
        </button>
      </div>
    </div>
  );
}
