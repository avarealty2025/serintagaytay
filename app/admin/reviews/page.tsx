"use client";

import { useState, useEffect, useCallback } from "react";
import { UNITS } from "../../../src/data/units.ts";

interface Review {
  id: string;
  guest_name: string;
  unit_id: string | null;
  rating: number;
  body: string;
  source: string;
  stay_date: string | null;
  published: boolean;
  created_at: string;
}

const EMPTY: Review = {
  id: "",
  guest_name: "",
  unit_id: null,
  rating: 5,
  body: "",
  source: "direct",
  stay_date: null,
  published: true,
  created_at: "",
};

const SOURCE_OPTIONS = [
  { value: "direct", label: "Direct" },
  { value: "airbnb", label: "Airbnb" },
  { value: "agoda", label: "Agoda" },
  { value: "booking.com", label: "Booking.com" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } catch {
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing({ ...EMPTY });
    setError("");
  }

  function openEdit(r: Review) {
    setEditing({ ...r });
    setError("");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError("");

    const payload = {
      id: editing.id || undefined,
      guestName: editing.guest_name,
      rating: editing.rating,
      body: editing.body,
      source: editing.source,
      stayDate: editing.stay_date,
      published: editing.published,
      unitId: editing.unit_id,
    };

    try {
      const method = editing.id ? "PUT" : "POST";
      const res = await fetch("/api/reviews", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Save failed");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      load();
    } catch {
      setError("Delete failed");
    }
  }

  async function togglePublished(r: Review) {
    try {
      await fetch("/api/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, published: !r.published }),
      });
      load();
    } catch {
      setError("Update failed");
    }
  }

  function stars(n: number) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  const unitLabel = (uid: string | null) => {
    if (!uid) return "—";
    const u = UNITS.find((x) => x.id === uid);
    return u ? `${u.tower}-${u.code} ${u.buildingId === "west" ? "West" : "East"}` : uid.slice(0, 8);
  };

  return (
    <>
      <div className="page-head">
        <h1 className="today">Guest Reviews</h1>
        <button className="btn btn-sm" onClick={openNew}>+ Add Review</button>
      </div>

      {error && (
        <div className="notice" style={{ borderLeftColor: "var(--crit)", background: "color-mix(in srgb, var(--crit) 12%, transparent)" }}>
          {error}
        </div>
      )}

      {/* Edit / New modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>
              {editing.id ? "Edit Review" : "New Review"}
            </h2>

            <div className="field">
              <label>Guest Name *</label>
              <input
                type="text"
                value={editing.guest_name}
                onChange={(e) => setEditing({ ...editing, guest_name: e.target.value })}
                placeholder="Maria Santos"
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Rating *</label>
                <select
                  value={editing.rating}
                  onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{stars(n)} ({n})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Source</label>
                <select
                  value={editing.source}
                  onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Unit (optional)</label>
                <select
                  value={editing.unit_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, unit_id: e.target.value || null })}
                >
                  <option value="">No specific unit</option>
                  {UNITS.filter((u) => u.active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.tower}-{u.code} {u.buildingId === "west" ? "West" : "East"}{u.name ? ` (${u.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Stay Date</label>
                <input
                  type="date"
                  value={editing.stay_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, stay_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="field">
              <label>Review *</label>
              <textarea
                rows={4}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Write the guest's review or testimonial..."
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published (visible on public site)
            </label>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 2 }}
                onClick={handleSave}
                disabled={saving || !editing.guest_name.trim() || !editing.body.trim()}
              >
                {saving ? "Saving..." : editing.id ? "Update Review" : "Add Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="empty">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="empty">
          No reviews yet. Click <strong>+ Add Review</strong> to add a guest testimonial.
        </div>
      ) : (
        <div className="review-admin-list">
          {reviews.map((r) => (
            <div key={r.id} className="review-admin-card">
              <div className="rac-head">
                <div>
                  <strong>{r.guest_name}</strong>
                  <span className="rac-stars" style={{ color: "#C89F45" }}>{stars(r.rating)}</span>
                </div>
                <div className="rac-actions">
                  <button
                    className={`pill ${r.published ? "free" : "gone"}`}
                    onClick={() => togglePublished(r)}
                    style={{ cursor: "pointer", fontSize: "0.68rem" }}
                  >
                    {r.published ? "Published" : "Draft"}
                  </button>
                  <button className="btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
                  <button className="btn-outline btn-sm" style={{ color: "var(--crit)" }} onClick={() => handleDelete(r.id)}>Delete</button>
                </div>
              </div>
              <p className="rac-body">{r.body}</p>
              <div className="rac-meta">
                <span>{r.source}</span>
                {r.stay_date && <span>{r.stay_date}</span>}
                <span>{unitLabel(r.unit_id)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
