"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteBtn({ bookingId, guest }: { bookingId: string; guest: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to delete booking");
        setDeleting(false);
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Connection error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "var(--crit)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "0.2rem 0.5rem",
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: deleting ? "wait" : "pointer",
          }}
        >
          {deleting ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          style={{
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: "4px",
            padding: "0.2rem 0.5rem",
            fontSize: "0.7rem",
            color: "var(--text-2)",
            cursor: "pointer",
          }}
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        background: "none",
        border: "none",
        color: "var(--crit)",
        fontSize: "0.72rem",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "none",
        padding: 0,
      }}
    >
      Delete
    </button>
  );
}
