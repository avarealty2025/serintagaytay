"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  grossAmount: number;
  parkingFee: number;
  parkingFeeType: "per_night" | "one_time";
  nights: number;
}

export function BookingAmounts({ bookingId, grossAmount, parkingFee, parkingFeeType, nights }: Props) {
  const router = useRouter();
  const parkingTotal = parkingFee > 0
    ? (parkingFeeType === "per_night" ? parkingFee * nights : parkingFee)
    : 0;
  const unitAmount = grossAmount - parkingTotal;

  const [editingField, setEditingField] = useState<"unit" | "parking" | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(field: "unit" | "parking") {
    setEditingField(field);
    setEditVal(String(field === "unit" ? unitAmount : parkingFee));
  }

  async function save() {
    if (editingField === null) return;
    setSaving(true);

    const newVal = Number(editVal) || 0;
    const body: Record<string, unknown> = {};

    if (editingField === "unit") {
      body.grossAmount = newVal + parkingTotal;
    } else {
      body.parkingFee = newVal;
      const newParkingTotal = newVal > 0
        ? (parkingFeeType === "per_night" ? newVal * nights : newVal)
        : 0;
      body.grossAmount = unitAmount + newParkingTotal;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } catch { /* ignore */ }

    setSaving(false);
    setEditingField(null);
  }

  function cancel() {
    setEditingField(null);
  }

  const inputStyle = {
    width: "4.5rem",
    fontSize: "inherit",
    fontFamily: "var(--mono, monospace)",
    padding: "0.15rem 0.3rem",
    border: "1px solid var(--accent)",
    borderRadius: 4,
    outline: "none",
    textAlign: "right" as const,
  };

  const clickStyle = {
    cursor: "pointer",
    fontFamily: "var(--mono, monospace)",
    borderBottom: "1px dashed var(--line-soft)",
  };

  const total = grossAmount;

  return (
    <>
      {/* Unit Amount */}
      <td className="tar">
        {editingField === "unit" ? (
          <input
            autoFocus
            type="number"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            disabled={saving}
            style={inputStyle}
          />
        ) : (
          <span onClick={() => startEdit("unit")} title="Click to edit unit amount" style={clickStyle}>
            {unitAmount > 0 ? unitAmount.toLocaleString() : "0"}
          </span>
        )}
      </td>

      {/* Parking Amount */}
      <td className="tar">
        {editingField === "parking" ? (
          <input
            autoFocus
            type="number"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            disabled={saving}
            style={inputStyle}
          />
        ) : (
          <span
            onClick={() => startEdit("parking")}
            title="Click to edit parking fee"
            style={{ ...clickStyle, color: parkingFee > 0 ? "inherit" : "var(--text-3)" }}
          >
            {parkingFee > 0 ? parkingFee.toLocaleString() : "0"}
          </span>
        )}
      </td>

      {/* Total */}
      <td className="tar mono" style={{ fontWeight: 700 }}>
        {total > 0 ? total.toLocaleString() : "0"}
      </td>
    </>
  );
}
