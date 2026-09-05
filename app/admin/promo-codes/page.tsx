"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PermGuard } from "../_perm-guard.tsx";

interface PromoCode {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  description: string | null;
  created_at: string;
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [discountPct, setDiscountPct] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      const res = await fetch("/api/promo-codes");
      const data = await res.json();
      setCodes(data.codes || []);
    } catch {
      setError("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setCode("");
    setDiscountPct(10);
    setMaxUses("");
    setValidFrom("");
    setValidUntil("");
    setDescription("");
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(p: PromoCode) {
    setCode(p.code);
    setDiscountPct(Number(p.discount_pct));
    setMaxUses(p.max_uses ? String(p.max_uses) : "");
    setValidFrom(p.valid_from || "");
    setValidUntil(p.valid_until || "");
    setDescription(p.description || "");
    setEditId(p.id);
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!code.trim() || discountPct <= 0 || discountPct > 100) {
      setError("Enter a valid code and discount (1-100%)");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      code: code.trim(),
      discountPct,
      maxUses: maxUses ? Number(maxUses) : null,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      description: description.trim() || null,
    };

    try {
      const url = editId ? `/api/promo-codes/${editId}` : "/api/promo-codes";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to save");
        return;
      }
      resetForm();
      await loadCodes();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: PromoCode) {
    await fetch(`/api/promo-codes/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await loadCodes();
  }

  async function handleDelete(p: PromoCode) {
    if (!confirm(`Delete promo code "${p.code}"?`)) return;
    await fetch(`/api/promo-codes/${p.id}`, { method: "DELETE" });
    await loadCodes();
  }

  if (loading) {
    return (
      <div className="page-head">
        <h1 className="today">Loading...</h1>
      </div>
    );
  }

  return (
    <PermGuard perm="settings.edit">
    <>
      <div className="page-head">
        <h1 className="today">Promo Codes</h1>
        <button
          className="btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + New Code
        </button>
      </div>

      {error && !showForm && (
        <div className="notice" style={{ background: "var(--crit)", color: "#fff", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>{editId ? "Edit Promo Code" : "New Promo Code"}</h2>
          <div className="form-body">
            {error && (
              <div style={{ padding: "0.6rem 0.9rem", background: "color-mix(in srgb, var(--crit) 12%, transparent)", borderRadius: "6px", borderLeft: "3px solid var(--crit)", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--crit)" }}>{error}</p>
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="code">Code *</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER25"
                  style={{ textTransform: "uppercase", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}
                />
              </div>
              <div className="field">
                <label htmlFor="discountPct">Discount % *</label>
                <input
                  type="number"
                  id="discountPct"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="maxUses">Max Uses</label>
                <input
                  type="number"
                  id="maxUses"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summer promo for returning guests"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="validFrom">Valid From</label>
                <input
                  type="date"
                  id="validFrom"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="validUntil">Valid Until</label>
                <input
                  type="date"
                  id="validUntil"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
              <button className="btn btn-outline" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>
          {codes.length} promo code{codes.length !== 1 ? "s" : ""}
        </h2>
        {codes.length === 0 ? (
          <div className="form-body">
            <p style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
              No promo codes yet. Click &ldquo;+ New Code&rdquo; to create one.
            </p>
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Uses</th>
                  <th>Valid Period</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((p) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const expired = p.valid_until && today > p.valid_until;
                  const maxedOut = p.max_uses && p.current_uses >= p.max_uses;
                  const statusLabel = !p.active
                    ? "Inactive"
                    : expired
                      ? "Expired"
                      : maxedOut
                        ? "Maxed Out"
                        : "Active";
                  const statusColor = statusLabel === "Active"
                    ? "var(--good)"
                    : statusLabel === "Inactive"
                      ? "var(--text-3)"
                      : "var(--warn, #C89F45)";

                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.08em" }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {Number(p.discount_pct)}%
                      </td>
                      <td className="mono">
                        {p.current_uses}{p.max_uses ? ` / ${p.max_uses}` : ""}
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {p.valid_from || p.valid_until ? (
                          <>
                            {p.valid_from || "—"} to {p.valid_until || "—"}
                          </>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>Always</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>
                        {p.description || "—"}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: statusColor }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            onClick={() => startEdit(p)}
                            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, padding: 0 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(p)}
                            style={{ background: "none", border: "none", color: p.active ? "var(--warn, #C89F45)" : "var(--good)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, padding: 0 }}
                          >
                            {p.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            style={{ background: "none", border: "none", color: "var(--crit)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, padding: 0 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
    </PermGuard>
  );
}
