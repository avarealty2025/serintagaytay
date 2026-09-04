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

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterSource, setFilterSource] = useState("");

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

  function cancelEdit() {
    setEditing(null);
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
        setSaving(false);
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
      if (editing?.id === id) setEditing(null);
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
    return u ? `${u.tower}-${u.code}` : uid.slice(0, 8);
  };

  const filtered = filterSource
    ? reviews.filter((r) => r.source === filterSource)
    : reviews;

  const published = reviews.filter((r) => r.published).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const inputStyle = {
    width: "100%",
    fontSize: "0.82rem",
    padding: "0.4rem 0.5rem",
    border: "1px solid var(--line)",
    borderRadius: 5,
    background: "var(--bg)",
    color: "var(--text-1)",
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Guest Reviews</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--text-3)" }}>
            Manage guest testimonials shown on the public site
          </p>
        </div>
        <button className="btn" onClick={openNew}>+ Add Review</button>
      </div>

      {/* Summary tiles */}
      <div className="tiles">
        <div className="tile">
          <p className="k">Total Reviews</p>
          <p className="v">{reviews.length}</p>
        </div>
        <div className="tile">
          <p className="k">Published</p>
          <p className="v" style={{ color: "var(--good, #27ae60)" }}>{published}</p>
          <p className="s">{reviews.length - published} drafts</p>
        </div>
        <div className="tile">
          <p className="k">Avg Rating</p>
          <p className="v" style={{ color: "#C89F45" }}>{avgRating} ★</p>
        </div>
      </div>

      {error && (
        <div className="notice" style={{ borderLeftColor: "var(--crit)", background: "color-mix(in srgb, var(--crit) 12%, transparent)", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      {/* Inline edit/add form */}
      {editing && (
        <div className="panel" style={{ marginBottom: "1rem", borderLeft: "3px solid var(--accent)" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
            {editing.id ? "Edit Review" : "New Review"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Guest Name *</label>
              <input
                type="text"
                value={editing.guest_name}
                onChange={(e) => setEditing({ ...editing, guest_name: e.target.value })}
                placeholder="e.g. Maria Santos"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rating</label>
              <select
                value={editing.rating}
                onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                style={inputStyle}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{stars(n)} ({n})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Source</label>
              <select
                value={editing.source}
                onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                style={inputStyle}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Unit (optional)</label>
              <select
                value={editing.unit_id ?? ""}
                onChange={(e) => setEditing({ ...editing, unit_id: e.target.value || null })}
                style={inputStyle}
              >
                <option value="">No specific unit</option>
                {UNITS.filter((u) => u.active).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tower}-{u.code} {u.buildingId === "west" ? "W" : "E"}{u.name ? ` ${u.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stay Date</label>
              <input
                type="date"
                value={editing.stay_date ?? ""}
                onChange={(e) => setEditing({ ...editing, stay_date: e.target.value || null })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />
                Published
              </label>
            </div>
          </div>
          <div style={{ marginTop: "0.6rem" }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Review Text *</label>
            <textarea
              rows={3}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder="Write the guest's review or testimonial..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button
              className="btn"
              onClick={handleSave}
              disabled={saving || !editing.guest_name.trim() || !editing.body.trim()}
            >
              {saving ? "Saving..." : editing.id ? "Save Changes" : "Add Review"}
            </button>
            <button className="btn btn-outline" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>
            {filtered.length} Review{filtered.length !== 1 ? "s" : ""}{" "}
            <span className="hint">click a row to edit</span>
          </h2>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg)", color: "var(--text-1)" }}
          >
            <option value="">All sources</option>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-3)", padding: "1rem 0" }}>Loading reviews...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--text-3)", padding: "1rem 0" }}>
            {reviews.length === 0
              ? "No reviews yet. Click + Add Review to add a guest testimonial."
              : "No reviews match this filter."}
          </p>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Source</th>
                  <th>Unit</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    style={{
                      cursor: "pointer",
                      background: editing?.id === r.id ? "color-mix(in srgb, var(--accent) 8%, transparent)" : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.guest_name}</td>
                    <td style={{ color: "#C89F45", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                      {stars(r.rating)}
                    </td>
                    <td style={{ maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--text-2)" }}>
                      {r.body}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>
                      {SOURCE_LABEL[r.source] ?? r.source}
                    </td>
                    <td className="mono" style={{ fontSize: "0.78rem" }}>
                      {unitLabel(r.unit_id)}
                    </td>
                    <td style={{ fontSize: "0.78rem", whiteSpace: "nowrap", color: "var(--text-3)" }}>
                      {r.stay_date || "—"}
                    </td>
                    <td>
                      <button
                        className={`pill ${r.published ? "free" : "gone"}`}
                        onClick={(e) => { e.stopPropagation(); togglePublished(r); }}
                        style={{ cursor: "pointer", fontSize: "0.68rem" }}
                      >
                        {r.published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn-outline btn-sm"
                        style={{ color: "var(--crit)", fontSize: "0.68rem" }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
