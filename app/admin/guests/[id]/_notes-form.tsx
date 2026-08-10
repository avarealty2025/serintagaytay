"use client";

import { useState } from "react";

export function NotesForm({ guestId, initial }: { guestId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="crm-notes">
      <h3>Notes</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Add notes about this guest — preferences, special requests, VIP status..."
        style={{
          width: "100%",
          padding: "0.75rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          fontFamily: "var(--sans)",
          fontSize: "0.88rem",
          resize: "vertical",
          background: "var(--surface)",
        }}
      />
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Notes"}
        </button>
        {saved && (
          <span style={{ color: "var(--good)", fontSize: "0.82rem", fontWeight: 600 }}>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
