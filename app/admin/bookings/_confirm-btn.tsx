"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmBtn({ bookingId, status }: { bookingId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (status === "confirmed") {
    return <span className="pill free" style={{ fontSize: "0.68rem" }}>Confirmed</span>;
  }

  if (status === "cancelled") {
    return <span className="pill gone" style={{ fontSize: "0.68rem" }}>Cancelled</span>;
  }

  async function handleConfirm() {
    if (!confirm("Confirm this booking? A confirmation email will be sent to the guest.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to confirm");
      }
    } catch {
      alert("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn btn-sm"
      onClick={handleConfirm}
      disabled={loading}
      style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem" }}
    >
      {loading ? "..." : "Confirm"}
    </button>
  );
}
