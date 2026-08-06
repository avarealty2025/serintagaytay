"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPHP } from "../../../../src/lib/pricing.ts";

const AMENITY_OPTIONS = [
  "Wi-Fi",
  "Air Conditioning",
  "TV / Smart TV",
  "Refrigerator",
  "Microwave",
  "Electric Kettle",
  "Rice Cooker",
  "Induction Cooker",
  "Cooking Utensils",
  "Towels & Linens",
  "Hot & Cold Shower",
  "Hair Dryer",
  "Iron & Board",
  "Balcony",
  "Parking",
  "Swimming Pool Access",
  "Building Gym Access",
];

interface BulkUnit {
  supabaseId: string;
  appId: string;
  tower: number;
  code: string;
  name: string | null;
  type: string;
  building: string;
  baseRate: number;
  weekendRate: number;
  cleaningFee: number;
  extraGuestFee: number;
  parkingFee: number;
  earlyCheckinFee: number;
  lateCheckoutFee: number;
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  minStay: number;
  amenities: string[];
  active: boolean;
}

type EditField = "baseRate" | "weekendRate" | "cleaningFee" | "extraGuestFee"
  | "parkingFee" | "earlyCheckinFee" | "lateCheckoutFee"
  | "weeklyDiscountPct" | "monthlyDiscountPct" | "minStay" | "amenities";

const FIELD_LABELS: Record<EditField, string> = {
  baseRate: "Weekday Rate",
  weekendRate: "Weekend Rate",
  cleaningFee: "Cleaning Fee",
  extraGuestFee: "Extra Guest Fee",
  parkingFee: "Parking Fee",
  earlyCheckinFee: "Early Check-in Fee",
  lateCheckoutFee: "Late Check-out Fee",
  weeklyDiscountPct: "Weekly Discount %",
  monthlyDiscountPct: "Monthly Discount %",
  minStay: "Min Stay (nights)",
  amenities: "Amenities",
};

export default function BulkEditPage() {
  const [units, setUnits] = useState<BulkUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editField, setEditField] = useState<EditField>("baseRate");
  const [editValue, setEditValue] = useState("");
  const [editAmenities, setEditAmenities] = useState<Set<string>>(new Set());
  const [amenityMode, setAmenityMode] = useState<"set" | "add" | "remove">("set");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/units/bulk")
      .then((r) => r.json())
      .then((data) => {
        setUnits(data.units || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleUnit(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === units.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(units.map((u) => u.supabaseId)));
    }
  }

  function selectByBuilding(building: string) {
    const ids = units.filter((u) => u.building === building).map((u) => u.supabaseId);
    setSelectedIds(new Set(ids));
  }

  function selectByType(type: string) {
    const ids = units.filter((u) => u.type === type).map((u) => u.supabaseId);
    setSelectedIds(new Set(ids));
  }

  async function handleBulkUpdate() {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    setSuccess("");

    let updates: Record<string, unknown> = {};

    if (editField === "amenities") {
      if (amenityMode === "set") {
        updates = { amenities: [...editAmenities] };
      } else {
        const targetUnits = units.filter((u) => selectedIds.has(u.supabaseId));
        for (const unit of targetUnits) {
          let newAmenities: string[];
          if (amenityMode === "add") {
            newAmenities = [...new Set([...unit.amenities, ...editAmenities])];
          } else {
            newAmenities = unit.amenities.filter((a) => !editAmenities.has(a));
          }
          const res = await fetch("/api/units/bulk", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              unitIds: [unit.supabaseId],
              updates: { amenities: newAmenities },
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Failed to update some units");
          }
        }
        setSuccess(`Updated amenities for ${selectedIds.size} units`);
        const refreshed = await fetch("/api/units/bulk").then((r) => r.json());
        if (refreshed.units) setUnits(refreshed.units);
        setSaving(false);
        return;
      }
    } else {
      const val = Number(editValue);
      if (isNaN(val) || val < 0) {
        setError("Enter a valid number");
        setSaving(false);
        return;
      }
      updates = { [editField]: val };
    }

    try {
      const res = await fetch("/api/units/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitIds: [...selectedIds],
          updates,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to update");
        return;
      }
      setSuccess(`Updated ${editField === "amenities" ? "amenities" : FIELD_LABELS[editField]} for ${selectedIds.size} units`);
      const refreshed = await fetch("/api/units/bulk").then((r) => r.json());
      if (refreshed.units) setUnits(refreshed.units);
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-head">
        <h1 className="today">Loading...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="today">Bulk Edit Units</h1>
        <Link href="/admin/units" className="btn btn-outline">
          Back to Units
        </Link>
      </div>

      {/* Selection controls */}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)" }}>
            Select:
          </span>
          <button className="btn btn-sm btn-outline" onClick={selectAll}>
            {selectedIds.size === units.length ? "Deselect All" : "All"}
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => selectByBuilding("west")}>
            West
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => selectByBuilding("east")}>
            East
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => selectByType("studio")}>
            Studios
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => selectByType("1br")}>
            1BR
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => selectByType("2br")}>
            2BR
          </button>
          <span style={{ marginLeft: "auto", fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)" }}>
            {selectedIds.size} selected
          </span>
        </div>
      </div>

      {/* Units grid */}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: "2rem" }}></th>
                <th>Unit</th>
                <th>Type</th>
                <th className="tar">Weekday</th>
                <th className="tar">Weekend</th>
                <th className="tar">Cleaning</th>
                <th className="tar">Extra Guest</th>
                <th className="tar">Parking</th>
                <th className="tar">Min Stay</th>
                <th>Amenities</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const isSelected = selectedIds.has(u.supabaseId);
                return (
                  <tr
                    key={u.supabaseId}
                    onClick={() => toggleUnit(u.supabaseId)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "color-mix(in srgb, var(--accent) 8%, transparent)" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUnit(u.supabaseId)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {u.tower}-{u.code} {u.building === "west" ? "W" : "E"}
                      {u.name && <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: "0.4rem", fontSize: "0.78rem" }}>{u.name}</span>}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>{u.type}</td>
                    <td className="tar mono">{formatPHP(u.baseRate)}</td>
                    <td className="tar mono">{formatPHP(u.weekendRate)}</td>
                    <td className="tar mono">{formatPHP(u.cleaningFee)}</td>
                    <td className="tar mono">{formatPHP(u.extraGuestFee)}</td>
                    <td className="tar mono">{formatPHP(u.parkingFee)}</td>
                    <td className="tar">{u.minStay}</td>
                    <td style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.amenities.length ? u.amenities.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk edit form */}
      {selectedIds.size > 0 && (
        <div className="panel" style={{ borderLeft: "3px solid var(--accent)" }}>
          <h2>
            Bulk Update — {selectedIds.size} unit{selectedIds.size !== 1 ? "s" : ""}
          </h2>
          <div className="form-body">
            {error && (
              <div style={{ padding: "0.5rem 0.75rem", background: "color-mix(in srgb, var(--crit) 10%, transparent)", borderRadius: "6px", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--crit)" }}>{error}</p>
              </div>
            )}
            {success && (
              <div style={{ padding: "0.5rem 0.75rem", background: "color-mix(in srgb, var(--good) 10%, transparent)", borderRadius: "6px", marginBottom: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--good)" }}>{success}</p>
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="editField">Field to Update</label>
                <select
                  id="editField"
                  value={editField}
                  onChange={(e) => {
                    setEditField(e.target.value as EditField);
                    setEditValue("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {editField === "amenities" ? (
                <div className="field">
                  <label>Mode</label>
                  <select value={amenityMode} onChange={(e) => setAmenityMode(e.target.value as "set" | "add" | "remove")}>
                    <option value="set">Replace all amenities</option>
                    <option value="add">Add amenities</option>
                    <option value="remove">Remove amenities</option>
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="editValue">New Value</label>
                  <input
                    type="number"
                    id="editValue"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    min={0}
                    step={editField.includes("Pct") ? 1 : 100}
                    placeholder={`Enter new ${FIELD_LABELS[editField]}`}
                  />
                </div>
              )}
            </div>

            {editField === "amenities" && (
              <div className="field" style={{ marginBottom: "0.75rem" }}>
                <label>Select Amenities</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {AMENITY_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setEditAmenities((prev) => {
                          const next = new Set(prev);
                          if (next.has(a)) next.delete(a);
                          else next.add(a);
                          return next;
                        });
                      }}
                      style={{
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.75rem",
                        borderRadius: "999px",
                        border: editAmenities.has(a) ? "2px solid var(--accent)" : "1px solid var(--line)",
                        background: editAmenities.has(a) ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface)",
                        color: editAmenities.has(a) ? "var(--accent)" : "var(--text-2)",
                        cursor: "pointer",
                        fontWeight: editAmenities.has(a) ? 600 : 400,
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn"
              onClick={handleBulkUpdate}
              disabled={saving || (editField !== "amenities" && !editValue)}
            >
              {saving
                ? "Updating..."
                : `Update ${FIELD_LABELS[editField]} for ${selectedIds.size} unit${selectedIds.size !== 1 ? "s" : ""}`
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
