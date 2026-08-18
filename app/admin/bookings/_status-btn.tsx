"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StatusBtn({
  bookingId,
  action,
  label,
  confirmMsg,
}: {
  bookingId: string;
  action: "checked_in" | "checked_out";
  label: string;
  confirmMsg: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update");
      }
    } catch {
      alert("Connection error");
    } finally {
      setLoading(false);
    }
  }

  const color = action === "checked_out" ? "var(--warn, #C89F45)" : "var(--good, #2f5a1e)";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        fontSize: "0.7rem",
        padding: "0.2rem 0.6rem",
        border: `1px solid ${color}`,
        borderRadius: "4px",
        background: "transparent",
        color,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}
