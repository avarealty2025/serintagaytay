"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function ParkingSlot({ bookingId, value }: { bookingId: string; value: string | null }) {
  const [editing, setEditing] = useState(false);
  const [slot, setSlot] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function save() {
    if (slot === (value || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkingSlot: slot }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={slot}
        onChange={(e) => setSlot(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setSlot(value || ""); setEditing(false); } }}
        disabled={saving}
        autoFocus
        placeholder="e.g. B1-05"
        style={{ width: "5.5rem", fontSize: "inherit", fontFamily: "inherit", fontWeight: 600, padding: "0.15rem 0.3rem", border: "1px solid var(--accent)", borderRadius: "4px", outline: "none", color: "var(--accent)" }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit parking slot"
      style={{ cursor: "pointer", color: value ? "var(--accent)" : "var(--text-3)", fontWeight: 600, textDecoration: "none" }}
    >
      {value || "—"}
    </span>
  );
}
